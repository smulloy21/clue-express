import {
  IllegalActionError,
  accuse,
  createGame,
  pass,
  redactStateForPlayer,
  resolveDisproval,
  submitGuess,
  type GameState,
  type PlayerConfig,
} from "@clue/engine";
import { Router, type Request, type Response } from "express";
import { randomInt, randomUUID } from "node:crypto";
import type { GameDocument, GameDocumentStatus } from "../repositories/gameDocument.js";
import type {
  GameRecordParticipant,
  GameRecordRepository,
} from "../repositories/gameRecordRepository.js";
import type { GameRepository } from "../repositories/gameRepository.js";
import { resolveBotTurns } from "./botOrchestration.js";
import { applyStateToDocument, toEngineState } from "./mapping.js";
import { accusationSchema, createGameSchema, disproveSchema, guessSchema } from "./validation.js";

export interface GameRoutesDependencies {
  gameRepository: GameRepository;
  gameRecordRepository: GameRecordRepository;
}

function findHumanSeat(players: readonly { seat: number; type: string }[]): number {
  const human = players.find((p) => p.type === "human");
  if (!human) {
    throw new Error("game has no human player");
  }
  return human.seat;
}

async function recordGameIfJustFinished(
  gameRecordRepository: GameRecordRepository,
  previousStatus: GameDocumentStatus,
  doc: GameDocument,
): Promise<void> {
  if (previousStatus !== "in_progress" || doc.status !== "finished") {
    return;
  }
  const participants: GameRecordParticipant[] = doc.players.map((p) => ({
    seat: p.seat,
    type: p.type,
    ...(p.difficulty ? { difficulty: p.difficulty } : {}),
  }));
  const winner =
    doc.winnerSeat === null ? undefined : doc.players.find((p) => p.seat === doc.winnerSeat);
  await gameRecordRepository.create({
    userId: doc.userId,
    participants,
    winnerSeat: doc.winnerSeat,
    humanWon: winner?.type === "human",
  });
}

export function createGameRouter(deps: GameRoutesDependencies): Router {
  const { gameRepository, gameRecordRepository } = deps;
  const router = Router();

  router.use((req, res, next) => {
    if (!req.session.userId && !req.session.guest) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }
    next();
  });

  async function loadOwnedActiveGame(
    gameId: string,
    sessionId: string,
  ): Promise<GameDocument | null> {
    const doc = await gameRepository.load(gameId);
    if (!doc || doc.ownerSessionId !== sessionId || doc.status === "abandoned") {
      return null;
    }
    return doc;
  }

  router.post("/", async (req, res, next) => {
    try {
      const result = createGameSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: "validation", issues: result.error.issues });
        return;
      }
      const { botDifficulties } = result.data;

      await gameRepository.abandonInProgressGamesForSession(req.sessionID);

      const players: PlayerConfig[] = [
        { type: "human" },
        { type: "bot", difficulty: botDifficulties[0] },
        { type: "bot", difficulty: botDifficulties[1] },
      ];
      const seed = randomInt(0, 2 ** 31 - 1);
      const initialState = createGame({ seed, players });
      const humanSeat = findHumanSeat(initialState.players);

      const now = new Date();
      const initialDoc: GameDocument = {
        _id: randomUUID(),
        userId: req.session.userId ?? null,
        ownerSessionId: req.sessionID,
        status: initialState.status,
        seed,
        solution: initialState.solution,
        players: initialState.players,
        turn: initialState.turn,
        winnerSeat: initialState.winnerSeat,
        events: initialState.events,
        createdAt: now,
        updatedAt: now,
      };

      const { state: finalState, knowledgeBySeat } = resolveBotTurns(
        initialDoc,
        initialState,
        humanSeat,
      );
      const finalDoc = applyStateToDocument(initialDoc, finalState, knowledgeBySeat);
      await gameRepository.save(finalDoc);
      await recordGameIfJustFinished(gameRecordRepository, initialDoc.status, finalDoc);

      res
        .status(201)
        .json({ gameId: finalDoc._id, state: redactStateForPlayer(finalState, humanSeat) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/state", async (req, res, next) => {
    try {
      const doc = await loadOwnedActiveGame(req.params.id!, req.sessionID);
      if (!doc) {
        res.status(404).json({ error: "game_not_found" });
        return;
      }
      const humanSeat = findHumanSeat(doc.players);
      const redacted = redactStateForPlayer(toEngineState(doc), humanSeat);

      const sinceRaw = req.query.since;
      const since = typeof sinceRaw === "string" && sinceRaw.length > 0 ? Number(sinceRaw) : -1;
      const events = redacted.events.filter((e) => e.index > since);

      res.status(200).json({ redactedState: redacted, events });
    } catch (error) {
      next(error);
    }
  });

  async function handleAction(
    req: Request<{ id: string }>,
    res: Response,
    apply: (state: GameState, humanSeat: number) => GameState,
  ): Promise<void> {
    const doc = await loadOwnedActiveGame(req.params.id, req.sessionID);
    if (!doc) {
      res.status(404).json({ error: "game_not_found" });
      return;
    }
    if (doc.status !== "in_progress") {
      res.status(409).json({ error: "game_not_active" });
      return;
    }

    const engineState = toEngineState(doc);
    const humanSeat = findHumanSeat(doc.players);

    let stateAfterAction;
    try {
      stateAfterAction = apply(engineState, humanSeat);
    } catch (error) {
      if (error instanceof IllegalActionError) {
        res.status(409).json({ error: "illegal_action", message: error.message });
        return;
      }
      throw error;
    }

    const { state: finalState, knowledgeBySeat } = resolveBotTurns(
      doc,
      stateAfterAction,
      humanSeat,
    );
    const finalDoc = applyStateToDocument(doc, finalState, knowledgeBySeat);
    await gameRepository.save(finalDoc);
    await recordGameIfJustFinished(gameRecordRepository, doc.status, finalDoc);

    res.status(200).json({ state: redactStateForPlayer(finalState, humanSeat) });
  }

  router.post("/:id/guess", async (req, res, next) => {
    try {
      const result = guessSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: "validation", issues: result.error.issues });
        return;
      }
      await handleAction(req, res, (state, humanSeat) =>
        submitGuess(state, humanSeat, result.data),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/disprove", async (req, res, next) => {
    try {
      const result = disproveSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: "validation", issues: result.error.issues });
        return;
      }
      await handleAction(req, res, (state, humanSeat) =>
        resolveDisproval(state, humanSeat, result.data.card),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/pass", async (req, res, next) => {
    try {
      await handleAction(req, res, (state, humanSeat) => pass(state, humanSeat));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/accuse", async (req, res, next) => {
    try {
      const result = accusationSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: "validation", issues: result.error.issues });
        return;
      }
      await handleAction(req, res, (state, humanSeat) => accuse(state, humanSeat, result.data));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
