export {
  ALL_CARDS,
  CATEGORIES,
  ROOMS,
  SUSPECTS,
  WEAPONS,
  categoryOfCard,
  isRoom,
  isSuspect,
  isWeapon,
  type Card,
  type CardName,
  type Category,
  type Room,
  type Suspect,
  type Weapon,
} from "./constants.js";

export type { Deal } from "./deck.js";
export { dealGame } from "./deck.js";

export { createRng, shuffle, type Rng } from "./rng.js";

export {
  type Accusation,
  type BotDifficulty,
  type GameEvent,
  type GameOverReason,
  type GameState,
  type GameStatus,
  type Guess,
  IllegalActionError,
  type PendingDisproval,
  type PlayerConfig,
  type PlayerState,
  type PlayerType,
  type Solution,
  type TurnPhase,
  type TurnState,
} from "./types.js";

export {
  accuse,
  createGame,
  pass,
  resolveDisproval,
  submitGuess,
  type CreateGameParams,
} from "./game.js";

export {
  redactStateForPlayer,
  type RedactedGameEvent,
  type RedactedGameState,
  type RedactedPendingDisproval,
  type RedactedPlayer,
  type RedactedTurnState,
} from "./redact.js";

export {
  createBotAgent,
  decideAccusation,
  decideDisproval,
  decideGuess,
  observeEvent,
  type BotAgentState,
  type CreateBotAgentOptions,
} from "./bots/agent.js";

export {
  createKnowledge,
  getBelief,
  getKnownSolution,
  isConfirmed,
  recordDisjunction,
  recordNo,
  recordYes,
  unconfirmedCardsInCategory,
  type Belief,
  type Disjunction,
  type Holder,
  type KnowledgeState,
} from "./bots/knowledge.js";

export { playOneGame, type SimulatedGameResult } from "./simulate/runGame.js";
export { summarize, type SimulationSummary } from "./simulate/stats.js";
