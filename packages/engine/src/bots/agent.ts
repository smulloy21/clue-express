import {
  ROOMS,
  SUSPECTS,
  WEAPONS,
  categoryOfCard,
  type CardName,
  type Category,
  type Room,
  type Suspect,
  type Weapon,
} from "../constants.js";
import type { RedactedGameEvent } from "../redact.js";
import type { Rng } from "../rng.js";
import type { Accusation, BotDifficulty, Guess } from "../types.js";
import {
  createKnowledge,
  getKnownSolution,
  recordDisjunction,
  recordNo,
  recordYes,
  unconfirmedCardsInCategory,
  type KnowledgeState,
} from "./knowledge.js";

const DEFAULT_BLUFF_PROBABILITY = 0.1;

export interface BotAgentState {
  seat: number;
  difficulty: BotDifficulty;
  playerCount: number;
  hand: readonly CardName[];
  knowledge: KnowledgeState;
  lastGuess?: Guess;
  rng: Rng;
  bluffProbability: number;
}

export interface CreateBotAgentOptions {
  bluffProbability?: number;
}

export function createBotAgent(
  seat: number,
  difficulty: BotDifficulty,
  hand: readonly CardName[],
  playerCount: number,
  rng: Rng,
  options: CreateBotAgentOptions = {},
): BotAgentState {
  return {
    seat,
    difficulty,
    playerCount,
    hand,
    knowledge: createKnowledge(seat, playerCount, hand),
    rng,
    bluffProbability: options.bluffProbability ?? DEFAULT_BLUFF_PROBABILITY,
  };
}

/**
 * Folds one publicly (or privately, if addressed to this bot) observed event into the bot's
 * knowledge. Easy bots only record their own hand and cards physically shown to them; hard bots
 * additionally draw negative inference from failed disprovals and disjunctions from unseen ones.
 */
export function observeEvent(agent: BotAgentState, event: RedactedGameEvent): BotAgentState {
  switch (event.type) {
    case "guess":
      return { ...agent, lastGuess: event.guess };

    case "no_disproval": {
      if (agent.difficulty !== "hard" || !agent.lastGuess) {
        return agent;
      }
      const { suspect, weapon, room } = agent.lastGuess;
      let knowledge = agent.knowledge;
      for (const card of [suspect, weapon, room]) {
        knowledge = recordNo(knowledge, card, event.seat);
      }
      return { ...agent, knowledge };
    }

    case "disprove": {
      if (event.card !== undefined) {
        return { ...agent, knowledge: recordYes(agent.knowledge, event.card, event.disproverSeat) };
      }
      if (agent.difficulty !== "hard" || !agent.lastGuess) {
        return agent;
      }
      const { suspect, weapon, room } = agent.lastGuess;
      const knowledge = recordDisjunction(agent.knowledge, event.disproverSeat, [
        suspect,
        weapon,
        room,
      ]);
      return { ...agent, knowledge };
    }

    default:
      return agent;
  }
}

export function decideDisproval(agent: BotAgentState, options: readonly CardName[]): CardName {
  return pickCard(options, agent.rng);
}

/** Null means "pass" — the bot's knowledge doesn't yet pin down a full solution. */
export function decideAccusation(agent: BotAgentState): Accusation | null {
  return getKnownSolution(agent.knowledge);
}

export function decideGuess(agent: BotAgentState): Guess {
  const pick = agent.difficulty === "easy" ? easyCategoryPick : hardCategoryPick;
  return {
    suspect: pick(agent, "suspect") as Suspect,
    weapon: pick(agent, "weapon") as Weapon,
    room: pick(agent, "room") as Room,
  };
}

function categoryCards(category: Category): readonly CardName[] {
  if (category === "suspect") return SUSPECTS;
  if (category === "weapon") return WEAPONS;
  return ROOMS;
}

function pickCard(candidates: readonly CardName[], rng: Rng): CardName {
  return candidates[Math.floor(rng() * candidates.length)]!;
}

function ownCardsInCategory(agent: BotAgentState, category: Category): CardName[] {
  return agent.hand.filter((card) => categoryOfCard(card) === category);
}

/** Picks uniformly among cards with no confirmed holder; occasionally bluffs with an own card. */
function easyCategoryPick(agent: BotAgentState, category: Category): CardName {
  const ownCards = ownCardsInCategory(agent, category);
  if (ownCards.length > 0 && agent.rng() < agent.bluffProbability) {
    return pickCard(ownCards, agent.rng);
  }
  const unconfirmed = unconfirmedCardsInCategory(agent.knowledge, category);
  if (unconfirmed.length > 0) {
    return pickCard(unconfirmed, agent.rng);
  }
  return pickCard(categoryCards(category), agent.rng);
}

/**
 * Prefers cards whose holder is unknown, to maximize expected information from the disproval.
 * Once a category is fully solved, probing it further wastes the guess, so an own-hand card is
 * used there instead — keeping the other two categories' results uncontaminated and informative.
 */
function hardCategoryPick(agent: BotAgentState, category: Category): CardName {
  const unconfirmed = unconfirmedCardsInCategory(agent.knowledge, category);
  if (unconfirmed.length > 0) {
    return pickCard(unconfirmed, agent.rng);
  }
  const ownCards = ownCardsInCategory(agent, category);
  if (ownCards.length > 0) {
    return pickCard(ownCards, agent.rng);
  }
  return pickCard(categoryCards(category), agent.rng);
}
