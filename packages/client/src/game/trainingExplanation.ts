import {
  ALL_CARDS,
  type Belief,
  type CardName,
  type Category,
  type KnowledgeState,
  type RedactedGameEvent,
  type RedactedPlayer,
} from "@clue/engine";
import { describeEvent, playerLabel } from "./format.js";
import { computeKnowledge } from "./notepad.js";

export type DirectReason = "shown_to_you" | "could_not_disprove";

export interface NotepadChange {
  card: CardName;
  category: Category;
  holderKey: string;
  belief: Belief;
}

export interface TurnExplanation {
  turnSummary: string[];
  direct: string[];
  deduced: string[];
}

function targetKey(card: CardName, holderKey: string): string {
  return `${card}|${holderKey}`;
}

/**
 * The cells a turn's own events assert directly — exactly the same facts the engine's
 * `observeEvent` records without propagation: a failed disproval rules out all three guessed
 * cards for that seat, and a disproval that shows a card to this viewer confirms that one cell.
 * Everything else that changes this turn is a downstream consequence of constraint propagation.
 */
export function directTargetsForTurn(
  turnEvents: readonly RedactedGameEvent[],
): Map<string, DirectReason> {
  const targets = new Map<string, DirectReason>();
  const guessEvent = turnEvents.find((e) => e.type === "guess");
  if (!guessEvent || guessEvent.type !== "guess") {
    return targets;
  }
  const { suspect, weapon, room } = guessEvent.guess;

  for (const event of turnEvents) {
    if (event.type === "no_disproval") {
      for (const card of [suspect, weapon, room]) {
        targets.set(targetKey(card, String(event.seat)), "could_not_disprove");
      }
    } else if (event.type === "disprove" && event.card !== undefined) {
      targets.set(targetKey(event.card, String(event.disproverSeat)), "shown_to_you");
    }
  }
  return targets;
}

export function diffBeliefs(
  before: KnowledgeState,
  after: KnowledgeState,
  playerCount: number,
): NotepadChange[] {
  const holderKeys = [
    ...Array.from({ length: playerCount }, (_, seat) => String(seat)),
    "envelope",
  ];
  const changes: NotepadChange[] = [];
  for (const { name: card, category } of ALL_CARDS) {
    for (const holderKey of holderKeys) {
      const from = before.beliefs[card]![holderKey]!;
      const to = after.beliefs[card]![holderKey]!;
      if (from !== to) {
        changes.push({ card, category, holderKey, belief: to });
      }
    }
  }
  return changes;
}

function holderLabel(
  holderKey: string,
  players: readonly RedactedPlayer[],
  ownSeat: number,
): string {
  const seat = Number(holderKey);
  const player = players.find((p) => p.seat === seat);
  return player ? playerLabel(player, ownSeat) : `Player ${seat}`;
}

function phraseDirectChange(
  change: NotepadChange,
  reason: DirectReason,
  players: readonly RedactedPlayer[],
  ownSeat: number,
): string {
  const who = holderLabel(change.holderKey, players, ownSeat);
  if (reason === "shown_to_you") {
    return `✓ ${who} showed you ${change.card}`;
  }
  return `✕ ${who} doesn't have ${change.card}`;
}

function phraseDeducedChange(
  change: NotepadChange,
  players: readonly RedactedPlayer[],
  ownSeat: number,
): string {
  if (change.holderKey === "envelope") {
    return change.belief === "yes"
      ? `✓ ${change.card} must be in the envelope`
      : `✕ ${change.card} is not in the envelope`;
  }
  const who = holderLabel(change.holderKey, players, ownSeat);
  return change.belief === "yes"
    ? `✓ ${who} must have ${change.card}`
    : `✕ ${who} doesn't have ${change.card}`;
}

/**
 * Explains one turn's notepad impact for training mode: what the turn's own events say plainly
 * (`turnSummary`), which resulting belief changes are directly asserted by those events
 * (`direct`), and which are further consequences of the engine's constraint propagation
 * (`deduced`) — e.g. single-holder-per-card, 6-cards-per-hand, or envelope-category-elimination.
 */
export function explainTurn(
  ownSeat: number,
  ownHand: readonly CardName[],
  playerCount: number,
  players: readonly RedactedPlayer[],
  turnGroups: readonly (readonly RedactedGameEvent[])[],
  turnIndex: number,
): TurnExplanation {
  const turnEvents = turnGroups[turnIndex] ?? [];
  const beforeEvents = turnGroups.slice(0, turnIndex).flat();
  const afterEvents = [...beforeEvents, ...turnEvents];

  const before = computeKnowledge(ownSeat, ownHand, playerCount, beforeEvents);
  const after = computeKnowledge(ownSeat, ownHand, playerCount, afterEvents);

  const directTargets = directTargetsForTurn(turnEvents);
  const changes = diffBeliefs(before, after, playerCount);

  const direct: string[] = [];
  const deduced: string[] = [];
  for (const change of changes) {
    const reason = directTargets.get(targetKey(change.card, change.holderKey));
    if (reason) {
      direct.push(phraseDirectChange(change, reason, players, ownSeat));
    } else {
      deduced.push(phraseDeducedChange(change, players, ownSeat));
    }
  }

  return {
    turnSummary: turnEvents.map((e) => describeEvent(e, players, ownSeat)),
    direct,
    deduced,
  };
}
