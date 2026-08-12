import type { CardName } from "./constants.js";
import type {
  BotDifficulty,
  GameEvent,
  GameState,
  GameStatus,
  PlayerType,
  Solution,
  TurnPhase,
} from "./types.js";

export interface RedactedPlayer {
  seat: number;
  type: PlayerType;
  difficulty?: BotDifficulty;
  eliminated: boolean;
  handSize: number;
  /** Only present when this player is the viewer. */
  hand?: CardName[];
}

export interface RedactedPendingDisproval {
  guesserSeat: number;
  disproverSeat: number;
  /** Only present when the viewer is the disprover who must choose. */
  options?: CardName[];
}

export interface RedactedTurnState {
  currentSeat: number;
  phase: TurnPhase;
  pending?: RedactedPendingDisproval;
}

type RedactedDisproveEvent = Omit<Extract<GameEvent, { type: "disprove" }>, "card"> & {
  card?: CardName;
};

export type RedactedGameEvent = Exclude<GameEvent, { type: "disprove" }> | RedactedDisproveEvent;

export interface RedactedGameState {
  viewerSeat: number;
  status: GameStatus;
  /** Only present once the game has finished. */
  solution?: Solution;
  players: RedactedPlayer[];
  turn: RedactedTurnState;
  winnerSeat: number | null;
  events: RedactedGameEvent[];
}

/**
 * Produces the view of game state safe to send to a given player. Only the guesser and the
 * disprover ever learn which card was shown in a disproval; nobody but a player themselves
 * sees another player's hand; the solution is withheld until the game finishes.
 */
export function redactStateForPlayer(state: GameState, viewerSeat: number): RedactedGameState {
  const viewer = state.players[viewerSeat];
  if (!viewer) {
    throw new RangeError(`no such seat: ${viewerSeat}`);
  }

  const players: RedactedPlayer[] = state.players.map((p) => {
    const redacted: RedactedPlayer = {
      seat: p.seat,
      type: p.type,
      eliminated: p.eliminated,
      handSize: p.hand.length,
    };
    if (p.difficulty) {
      redacted.difficulty = p.difficulty;
    }
    if (p.seat === viewerSeat) {
      redacted.hand = [...p.hand];
    }
    return redacted;
  });

  const turn: RedactedTurnState = {
    currentSeat: state.turn.currentSeat,
    phase: state.turn.phase,
  };
  if (state.turn.pending) {
    const { guesserSeat, disproverSeat, options } = state.turn.pending;
    turn.pending =
      disproverSeat === viewerSeat
        ? { guesserSeat, disproverSeat, options: [...options] }
        : { guesserSeat, disproverSeat };
  }

  const events: RedactedGameEvent[] = state.events.map((event) => {
    if (
      event.type === "disprove" &&
      event.guesserSeat !== viewerSeat &&
      event.disproverSeat !== viewerSeat
    ) {
      const { card: _card, ...rest } = event;
      return rest;
    }
    return event;
  });

  const redactedState: RedactedGameState = {
    viewerSeat,
    status: state.status,
    players,
    turn,
    winnerSeat: state.winnerSeat,
    events,
  };
  if (state.status === "finished") {
    redactedState.solution = state.solution;
  }
  return redactedState;
}
