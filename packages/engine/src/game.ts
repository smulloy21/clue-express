import { isRoom, isSuspect, isWeapon, type CardName } from "./constants.js";
import { dealGame } from "./deck.js";
import { createRng, shuffle } from "./rng.js";
import {
  IllegalActionError,
  type Accusation,
  type GameEvent,
  type GameState,
  type Guess,
  type PlayerConfig,
  type PlayerState,
} from "./types.js";

const PLAYERS_PER_GAME = 3;

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export interface CreateGameParams {
  seed: number;
  players: PlayerConfig[];
}

export function createGame(params: CreateGameParams): GameState {
  if (params.players.length !== PLAYERS_PER_GAME) {
    throw new IllegalActionError(`a game requires exactly ${PLAYERS_PER_GAME} players`);
  }

  const rng = createRng(params.seed);
  const seatedConfigs = shuffle(params.players, rng);
  const { solution, hands } = dealGame(rng);

  const players: PlayerState[] = seatedConfigs.map((config, seat) => ({
    ...config,
    seat,
    hand: hands[seat]!,
    eliminated: false,
  }));

  return {
    seed: params.seed,
    status: "in_progress",
    solution,
    players,
    turn: { currentSeat: 0, phase: "guess" },
    winnerSeat: null,
    events: [],
  };
}

function assertValidGuess(guess: Guess): void {
  if (!isSuspect(guess.suspect) || !isWeapon(guess.weapon) || !isRoom(guess.room)) {
    throw new IllegalActionError("guess contains an invalid card name");
  }
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
    turn: { ...state.turn },
    events: [...state.events],
  };
}

function pushEvent(state: GameState, event: DistributiveOmit<GameEvent, "index">): void {
  state.events.push({ ...event, index: state.events.length } as GameEvent);
}

function clockwiseFrom(seat: number, playerCount: number): number[] {
  const order: number[] = [];
  for (let c = 1; c < playerCount; c++) {
    order.push((seat + c) % playerCount);
  }
  return order;
}

function nextActiveSeat(state: GameState, fromSeat: number): number {
  const n = state.players.length;
  for (let c = 1; c <= n; c++) {
    const candidate = (fromSeat + c) % n;
    if (!state.players[candidate]!.eliminated) {
      return candidate;
    }
  }
  throw new IllegalActionError("no active players remain");
}

function requireInProgress(state: GameState): void {
  if (state.status !== "in_progress") {
    throw new IllegalActionError("game is not in progress");
  }
}

function requireCurrentPlayer(
  state: GameState,
  seat: number,
  phase: GameState["turn"]["phase"],
): void {
  if (state.turn.phase !== phase) {
    throw new IllegalActionError(`cannot act during phase "${state.turn.phase}"`);
  }
  if (state.turn.currentSeat !== seat) {
    throw new IllegalActionError("it is not this player's turn");
  }
}

export function submitGuess(state: GameState, seat: number, guess: Guess): GameState {
  requireInProgress(state);
  requireCurrentPlayer(state, seat, "guess");
  const player = state.players[seat];
  if (!player || player.eliminated) {
    throw new IllegalActionError("eliminated players cannot take turns");
  }
  assertValidGuess(guess);

  const next = cloneState(state);
  pushEvent(next, { type: "guess", seat, guess });

  for (const candidate of clockwiseFrom(seat, next.players.length)) {
    const candidatePlayer = next.players[candidate]!;
    const matches = candidatePlayer.hand.filter(
      (card) => card === guess.suspect || card === guess.weapon || card === guess.room,
    );

    if (matches.length === 0) {
      pushEvent(next, { type: "no_disproval", seat: candidate });
      continue;
    }

    if (matches.length === 1) {
      pushEvent(next, {
        type: "disprove",
        guesserSeat: seat,
        disproverSeat: candidate,
        card: matches[0]!,
      });
      next.turn = { currentSeat: seat, phase: "accuse_or_pass" };
      return next;
    }

    next.turn = {
      currentSeat: seat,
      phase: "awaiting_disproval",
      pending: { guesserSeat: seat, disproverSeat: candidate, options: matches },
    };
    return next;
  }

  next.turn = { currentSeat: seat, phase: "accuse_or_pass" };
  return next;
}

export function resolveDisproval(
  state: GameState,
  disproverSeat: number,
  card: CardName,
): GameState {
  requireInProgress(state);
  if (state.turn.phase !== "awaiting_disproval" || !state.turn.pending) {
    throw new IllegalActionError("no disproval is pending");
  }
  const { pending } = state.turn;
  if (pending.disproverSeat !== disproverSeat) {
    throw new IllegalActionError("it is not this player's disproval to resolve");
  }
  if (!pending.options.includes(card)) {
    throw new IllegalActionError("chosen card is not a valid disproval for this guess");
  }

  const next = cloneState(state);
  pushEvent(next, {
    type: "disprove",
    guesserSeat: pending.guesserSeat,
    disproverSeat,
    card,
  });
  next.turn = { currentSeat: pending.guesserSeat, phase: "accuse_or_pass" };
  return next;
}

export function accuse(state: GameState, seat: number, accusation: Accusation): GameState {
  requireInProgress(state);
  requireCurrentPlayer(state, seat, "accuse_or_pass");
  assertValidGuess(accusation);

  const next = cloneState(state);
  const correct =
    accusation.suspect === next.solution.suspect &&
    accusation.weapon === next.solution.weapon &&
    accusation.room === next.solution.room;

  pushEvent(next, { type: "accusation", seat, accusation, correct });

  if (correct) {
    next.status = "finished";
    next.winnerSeat = seat;
    pushEvent(next, {
      type: "game_over",
      winnerSeat: seat,
      reason: "correct_accusation",
      solution: next.solution,
    });
    return next;
  }

  next.players[seat] = { ...next.players[seat]!, eliminated: true };

  if (next.players[seat]!.type === "human") {
    next.status = "finished";
    next.winnerSeat = null;
    pushEvent(next, {
      type: "game_over",
      winnerSeat: null,
      reason: "human_incorrect_accusation",
      solution: next.solution,
    });
    return next;
  }

  if (next.players.every((p) => p.eliminated)) {
    next.status = "finished";
    next.winnerSeat = null;
    pushEvent(next, {
      type: "game_over",
      winnerSeat: null,
      reason: "all_eliminated",
      solution: next.solution,
    });
    return next;
  }

  next.turn = { currentSeat: nextActiveSeat(next, seat), phase: "guess" };
  return next;
}

export function pass(state: GameState, seat: number): GameState {
  requireInProgress(state);
  requireCurrentPlayer(state, seat, "accuse_or_pass");

  const next = cloneState(state);
  pushEvent(next, { type: "pass", seat });
  next.turn = { currentSeat: nextActiveSeat(next, seat), phase: "guess" };
  return next;
}
