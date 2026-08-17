import {
  ALL_CARDS,
  createBotAgent,
  createRng,
  getBelief,
  observeEvent,
  type Belief,
  type CardName,
  type Category,
  type KnowledgeState,
  type RedactedGameEvent,
} from "@clue/engine";

export interface NotepadRow {
  card: CardName;
  category: Category;
  /** One belief per player seat, in seat order, followed by the envelope. */
  cells: Belief[];
}

/**
 * The human sees exactly the same public/private event stream a "hard" bot at their seat would —
 * so replaying it through the same knowledge base gives everything they can *provably* deduce
 * (their own hand, cards shown to them, and inference from public disprovals), with no cheating:
 * it's the identical reasoning the server's own hard bots use.
 */
export function computeKnowledge(
  ownSeat: number,
  ownHand: readonly CardName[],
  playerCount: number,
  events: readonly RedactedGameEvent[],
): KnowledgeState {
  let agent = createBotAgent(ownSeat, "hard", ownHand, playerCount, createRng(0));
  for (const event of events) {
    agent = observeEvent(agent, event);
  }
  return agent.knowledge;
}

export function computeNotepadRows(
  ownSeat: number,
  ownHand: readonly CardName[],
  playerCount: number,
  events: readonly RedactedGameEvent[],
): NotepadRow[] {
  const knowledge = computeKnowledge(ownSeat, ownHand, playerCount, events);

  const seats = Array.from({ length: playerCount }, (_, seat) => seat);
  return ALL_CARDS.map(({ name, category }) => ({
    card: name,
    category,
    cells: [
      ...seats.map((seat) => getBelief(knowledge, name, seat)),
      getBelief(knowledge, name, "envelope"),
    ],
  }));
}
