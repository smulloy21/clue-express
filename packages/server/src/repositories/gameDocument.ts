import type {
  GameEvent,
  GameStatus,
  KnowledgeState,
  PlayerState,
  Solution,
  TurnState,
} from "@clue/engine";

export interface GameDocumentPlayer extends PlayerState {
  /** Present only for bot players — persisted so a server restart mid-game doesn't lose their reasoning. */
  knowledge?: KnowledgeState;
}

/** No resume in v1: a stale in-progress game is marked abandoned rather than ever being resumed. */
export type GameDocumentStatus = GameStatus | "abandoned";

export interface GameDocument {
  _id: string;
  /** Null for guest games. */
  userId: string | null;
  /** The express-session id that created this game — the basis for "the session owns the game". */
  ownerSessionId: string;
  status: GameDocumentStatus;
  seed: number;
  solution: Solution;
  players: GameDocumentPlayer[];
  turn: TurnState;
  winnerSeat: number | null;
  events: GameEvent[];
  createdAt: Date;
  updatedAt: Date;
}
