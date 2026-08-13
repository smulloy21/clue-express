import {
  accuse,
  createBotAgent,
  createKnowledge,
  createRng,
  decideAccusation,
  decideDisproval,
  decideGuess,
  observeEvent,
  pass,
  redactStateForPlayer,
  resolveDisproval,
  submitGuess,
  type BotAgentState,
  type GameState,
  type KnowledgeState,
} from "@clue/engine";
import type { GameDocument } from "../repositories/gameDocument.js";

function reconstructAgents(doc: GameDocument): Map<number, BotAgentState> {
  const agents = new Map<number, BotAgentState>();
  for (const player of doc.players) {
    if (player.type !== "bot" || !player.difficulty) {
      continue;
    }
    // Seeded from the game seed, the seat, and how far the game has progressed so far, so a bot
    // asked to decide something new never just replays an earlier decision — while staying fully
    // reproducible for a given game + event count.
    const rng = createRng(doc.seed + 1 + player.seat * 1009 + doc.events.length);
    const agent = createBotAgent(
      player.seat,
      player.difficulty,
      player.hand,
      doc.players.length,
      rng,
    );
    agents.set(player.seat, {
      ...agent,
      knowledge: player.knowledge ?? createKnowledge(player.seat, doc.players.length, player.hand),
    });
  }
  return agents;
}

/** Lets every bot observe events it's entitled to see, up to the current point in `state`. */
function syncAgents(
  state: GameState,
  agents: Map<number, BotAgentState>,
  observedCount: number,
): number {
  for (const [seat, agent] of agents) {
    const redacted = redactStateForPlayer(state, seat);
    let updated = agent;
    for (let i = observedCount; i < redacted.events.length; i++) {
      updated = observeEvent(updated, redacted.events[i]!);
    }
    agents.set(seat, updated);
  }
  return state.events.length;
}

export interface BotResolutionResult {
  state: GameState;
  knowledgeBySeat: ReadonlyMap<number, KnowledgeState>;
}

/**
 * Advances `state` — already updated by the human's own action — through every bot turn until
 * either it's the human's turn again or the game finishes. `doc` supplies each bot's hand,
 * difficulty, and knowledge as of *before* the human's action, which is exactly the event count to
 * resume observing from.
 */
export function resolveBotTurns(
  doc: GameDocument,
  stateAfterHumanAction: GameState,
  humanSeat: number,
): BotResolutionResult {
  const agents = reconstructAgents(doc);
  let state = stateAfterHumanAction;
  let observedCount = syncAgents(state, agents, doc.events.length);

  while (state.status === "in_progress") {
    const { phase, currentSeat, pending } = state.turn;

    if (phase === "guess") {
      if (currentSeat === humanSeat) break;
      state = submitGuess(state, currentSeat, decideGuess(agents.get(currentSeat)!));
    } else if (phase === "awaiting_disproval") {
      const disproverSeat = pending!.disproverSeat;
      if (disproverSeat === humanSeat) break;
      const card = decideDisproval(agents.get(disproverSeat)!, pending!.options);
      state = resolveDisproval(state, disproverSeat, card);
    } else {
      if (currentSeat === humanSeat) break;
      const agent = agents.get(currentSeat)!;
      const accusation = decideAccusation(agent);
      state = accusation ? accuse(state, currentSeat, accusation) : pass(state, currentSeat);
    }

    observedCount = syncAgents(state, agents, observedCount);
  }

  const knowledgeBySeat = new Map<number, KnowledgeState>();
  for (const [seat, agent] of agents) {
    knowledgeBySeat.set(seat, agent.knowledge);
  }
  return { state, knowledgeBySeat };
}
