import { ALL_CARDS, CATEGORIES, type CardName, type Category } from "../constants.js";
import type { Solution } from "../types.js";

/** A card's holder is one of the 3 seats, or the solution envelope. */
export type Holder = number | "envelope";
export type Belief = "yes" | "no" | "unknown";

export interface Disjunction {
  holder: number;
  /** Candidate cards, at least one of which `holder` is known to hold. Pruned as facts arrive. */
  cards: CardName[];
}

export interface KnowledgeState {
  selfSeat: number;
  playerCount: number;
  beliefs: Record<CardName, Record<string, Belief>>;
  disjunctions: Disjunction[];
}

function holderKey(holder: Holder): string {
  return String(holder);
}

function allHolders(playerCount: number): Holder[] {
  return [...Array.from({ length: playerCount }, (_, i) => i), "envelope"];
}

export function createKnowledge(
  selfSeat: number,
  playerCount: number,
  hand: readonly CardName[],
): KnowledgeState {
  const holders = allHolders(playerCount).map(holderKey);
  const beliefs = Object.fromEntries(
    ALL_CARDS.map((card) => [
      card.name,
      Object.fromEntries(holders.map((h) => [h, "unknown" as Belief])),
    ]),
  ) as Record<CardName, Record<string, Belief>>;

  let state: KnowledgeState = { selfSeat, playerCount, beliefs, disjunctions: [] };
  for (const card of hand) {
    state = recordYes(state, card, selfSeat);
  }
  return state;
}

export function getBelief(state: KnowledgeState, card: CardName, holder: Holder): Belief {
  return state.beliefs[card]![holderKey(holder)]!;
}

function setCell(
  state: KnowledgeState,
  card: CardName,
  holder: Holder,
  belief: Belief,
): KnowledgeState {
  const key = holderKey(holder);
  if (state.beliefs[card]![key] === belief) {
    return state;
  }
  return {
    ...state,
    beliefs: {
      ...state.beliefs,
      [card]: { ...state.beliefs[card], [key]: belief },
    },
  };
}

function propagateOnce(state: KnowledgeState): { state: KnowledgeState; changed: boolean } {
  let next = state;
  let changed = false;
  const holders = allHolders(next.playerCount);

  // Each card has exactly one holder among {players..., envelope}.
  for (const card of ALL_CARDS.map((c) => c.name)) {
    const yesHolder = holders.find((h) => getBelief(next, card, h) === "yes");
    if (yesHolder !== undefined) {
      for (const h of holders) {
        if (h !== yesHolder && getBelief(next, card, h) !== "no") {
          next = setCell(next, card, h, "no");
          changed = true;
        }
      }
      continue;
    }
    const nonNo = holders.filter((h) => getBelief(next, card, h) !== "no");
    if (nonNo.length === 1) {
      next = setCell(next, card, nonNo[0]!, "yes");
      changed = true;
    }
  }

  // Each player holds exactly 6 cards.
  for (let seat = 0; seat < next.playerCount; seat++) {
    const yesCount = ALL_CARDS.filter((c) => getBelief(next, c.name, seat) === "yes").length;
    if (yesCount === 6) {
      for (const card of ALL_CARDS.map((c) => c.name)) {
        if (getBelief(next, card, seat) === "unknown") {
          next = setCell(next, card, seat, "no");
          changed = true;
        }
      }
    }
  }

  // The envelope holds exactly one card per category.
  for (const category of CATEGORIES) {
    const cardsInCategory = ALL_CARDS.filter((c) => c.category === category).map((c) => c.name);
    const yesCard = cardsInCategory.find((card) => getBelief(next, card, "envelope") === "yes");
    if (yesCard !== undefined) {
      for (const card of cardsInCategory) {
        if (card !== yesCard && getBelief(next, card, "envelope") !== "no") {
          next = setCell(next, card, "envelope", "no");
          changed = true;
        }
      }
      continue;
    }
    const nonNo = cardsInCategory.filter((card) => getBelief(next, card, "envelope") !== "no");
    if (nonNo.length === 1) {
      next = setCell(next, nonNo[0]!, "envelope", "yes");
      changed = true;
    }
  }

  // Re-evaluate disjunctions: "holder has at least one of these cards."
  const remainingDisjunctions: Disjunction[] = [];
  for (const disjunction of next.disjunctions) {
    const candidates = disjunction.cards.filter(
      (c) => getBelief(next, c, disjunction.holder) !== "no",
    );
    if (
      candidates.length === 0 ||
      candidates.some((c) => getBelief(next, c, disjunction.holder) === "yes")
    ) {
      continue; // resolved (or contradicted, which shouldn't happen with consistent facts)
    }
    if (candidates.length === 1) {
      next = setCell(next, candidates[0]!, disjunction.holder, "yes");
      changed = true;
      continue;
    }
    remainingDisjunctions.push({ holder: disjunction.holder, cards: candidates });
  }
  next = { ...next, disjunctions: remainingDisjunctions };

  return { state: next, changed };
}

function propagate(state: KnowledgeState): KnowledgeState {
  let current = state;
  for (let i = 0; i < 100; i++) {
    const result = propagateOnce(current);
    current = result.state;
    if (!result.changed) {
      break;
    }
  }
  return current;
}

export function recordYes(state: KnowledgeState, card: CardName, holder: Holder): KnowledgeState {
  if (getBelief(state, card, holder) === "yes") {
    return state;
  }
  return propagate(setCell(state, card, holder, "yes"));
}

export function recordNo(state: KnowledgeState, card: CardName, holder: Holder): KnowledgeState {
  if (getBelief(state, card, holder) === "no") {
    return state;
  }
  return propagate(setCell(state, card, holder, "no"));
}

export function recordDisjunction(
  state: KnowledgeState,
  holder: number,
  cards: readonly CardName[],
): KnowledgeState {
  const candidates = cards.filter((c) => getBelief(state, c, holder) !== "no");
  if (candidates.length === 0 || candidates.some((c) => getBelief(state, c, holder) === "yes")) {
    return state;
  }
  if (candidates.length === 1) {
    return recordYes(state, candidates[0]!, holder);
  }
  return propagate({
    ...state,
    disjunctions: [...state.disjunctions, { holder, cards: candidates }],
  });
}

/** True once some holder is confirmed (`yes`) for this card — the bot no longer needs to probe it. */
export function isConfirmed(state: KnowledgeState, card: CardName): boolean {
  return allHolders(state.playerCount).some((h) => getBelief(state, card, h) === "yes");
}

export function unconfirmedCardsInCategory(state: KnowledgeState, category: Category): CardName[] {
  return ALL_CARDS.filter((c) => c.category === category && !isConfirmed(state, c.name)).map(
    (c) => c.name,
  );
}

/** The full solution, once the envelope's three cards are all determined; otherwise null. */
export function getKnownSolution(state: KnowledgeState): Solution | null {
  const byCategory = new Map<Category, CardName>();
  for (const category of CATEGORIES) {
    const cardsInCategory = ALL_CARDS.filter((c) => c.category === category).map((c) => c.name);
    const known = cardsInCategory.find((card) => getBelief(state, card, "envelope") === "yes");
    if (!known) {
      return null;
    }
    byCategory.set(category, known);
  }
  return {
    suspect: byCategory.get("suspect")!,
    weapon: byCategory.get("weapon")!,
    room: byCategory.get("room")!,
  } as Solution;
}
