import type { GameState, KnowledgeState, PlayerState } from "@clue/engine";
import type { GameDocument, GameDocumentPlayer } from "../repositories/gameDocument.js";

/** Converts a persisted document into the pure engine's working state. Never call on an abandoned game. */
export function toEngineState(doc: GameDocument): GameState {
  if (doc.status === "abandoned") {
    throw new Error(`game "${doc._id}" is abandoned and cannot be resumed`);
  }
  return {
    seed: doc.seed,
    status: doc.status,
    solution: doc.solution,
    players: doc.players.map(stripKnowledge),
    turn: doc.turn,
    winnerSeat: doc.winnerSeat,
    events: doc.events,
  };
}

function stripKnowledge(player: GameDocumentPlayer): PlayerState {
  const { knowledge: _knowledge, ...rest } = player;
  return rest;
}

/**
 * Folds the engine's latest state — plus each bot's updated knowledge — back into the persisted
 * document, preserving the document's own identity/ownership/audit fields.
 */
export function applyStateToDocument(
  doc: GameDocument,
  state: GameState,
  knowledgeBySeat: ReadonlyMap<number, KnowledgeState>,
): GameDocument {
  return {
    ...doc,
    status: state.status,
    players: state.players.map((player) => ({
      ...player,
      ...(knowledgeBySeat.has(player.seat) ? { knowledge: knowledgeBySeat.get(player.seat)! } : {}),
    })),
    turn: state.turn,
    winnerSeat: state.winnerSeat,
    events: state.events,
  };
}
