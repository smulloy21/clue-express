import { createGame, type GameState, type PlayerConfig } from "@clue/engine";
import { describe, expect, it } from "vitest";
import type { GameDocument } from "../repositories/gameDocument.js";
import { resolveBotTurns } from "./botOrchestration.js";

function makeDoc(state: GameState, overrides: Partial<GameDocument> = {}): GameDocument {
  const now = new Date();
  return {
    _id: "game-1",
    userId: null,
    ownerSessionId: "session-1",
    status: state.status,
    seed: state.seed,
    solution: state.solution,
    players: state.players,
    turn: state.turn,
    winnerSeat: state.winnerSeat,
    events: state.events,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function freshGame(players: PlayerConfig[], seed: number): GameState {
  return createGame({ seed, players });
}

describe("resolveBotTurns", () => {
  it("does nothing when it is already the human's turn to guess", () => {
    let state = freshGame(
      [{ type: "human" }, { type: "bot", difficulty: "easy" }, { type: "bot", difficulty: "easy" }],
      1,
    );
    const humanSeat = state.players.findIndex((p) => p.type === "human");
    // Force it to be the human's guess turn regardless of how seats were shuffled.
    state = { ...state, turn: { currentSeat: humanSeat, phase: "guess" } };
    const doc = makeDoc(state);

    const { state: result } = resolveBotTurns(doc, state, humanSeat);

    expect(result).toEqual(state);
  });

  it("does nothing when it is already the human's turn to disprove", () => {
    let state = freshGame(
      [{ type: "human" }, { type: "bot", difficulty: "easy" }, { type: "bot", difficulty: "easy" }],
      2,
    );
    const humanSeat = state.players.findIndex((p) => p.type === "human");
    const humanHand = state.players[humanSeat]!.hand;
    state = {
      ...state,
      turn: {
        currentSeat: (humanSeat + 2) % 3,
        phase: "awaiting_disproval",
        pending: {
          guesserSeat: (humanSeat + 2) % 3,
          disproverSeat: humanSeat,
          options: [humanHand[0]!],
        },
      },
    };
    const doc = makeDoc(state);

    const { state: result } = resolveBotTurns(doc, state, humanSeat);

    expect(result).toEqual(state);
  });

  it("resolves an all-bot prefix and always stops at the human's decision point or game end", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = freshGame(
        [
          { type: "human" },
          { type: "bot", difficulty: "hard" },
          { type: "bot", difficulty: "hard" },
        ],
        seed,
      );
      const humanSeat = state.players.findIndex((p) => p.type === "human");
      const doc = makeDoc(state);

      const { state: result } = resolveBotTurns(doc, state, humanSeat);

      expect(result.events.length).toBeGreaterThanOrEqual(state.events.length);

      if (result.status === "finished") {
        continue;
      }
      if (result.turn.phase === "awaiting_disproval") {
        expect(result.turn.pending!.disproverSeat).toBe(humanSeat);
      } else {
        expect(result.turn.currentSeat).toBe(humanSeat);
      }
    }
  });

  it("returns knowledge for every bot seat, correctly reflecting their own hand", () => {
    const state = freshGame(
      [{ type: "human" }, { type: "bot", difficulty: "hard" }, { type: "bot", difficulty: "hard" }],
      7,
    );
    const humanSeat = state.players.findIndex((p) => p.type === "human");
    const doc = makeDoc(state);

    const { knowledgeBySeat } = resolveBotTurns(doc, state, humanSeat);

    for (const player of state.players) {
      if (player.type !== "bot") continue;
      const knowledge = knowledgeBySeat.get(player.seat);
      expect(knowledge).toBeDefined();
      for (const card of player.hand) {
        expect(knowledge!.beliefs[card]![String(player.seat)]).toBe("yes");
      }
    }
  });
});
