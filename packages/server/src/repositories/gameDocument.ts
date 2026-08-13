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

export interface GameDocument {
  _id: string;
  /** Null for guest games. */
  userId: string | null;
  status: GameStatus;
  seed: number;
  solution: Solution;
  players: GameDocumentPlayer[];
  turn: TurnState;
  events: GameEvent[];
  createdAt: Date;
  updatedAt: Date;
}
