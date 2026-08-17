import type { RedactedGameEvent } from "@clue/engine";

/** Segments a game's full event history into turns, one player's "guess" through the next. */
export function groupEventsByTurn(events: readonly RedactedGameEvent[]): RedactedGameEvent[][] {
  const groups: RedactedGameEvent[][] = [];
  for (const event of events) {
    if (event.type === "guess") {
      groups.push([event]);
      continue;
    }
    const current = groups.at(-1);
    if (current) {
      current.push(event);
    }
  }
  return groups;
}

export interface RevealState {
  turnGroups: RedactedGameEvent[][];
  /** How many of the full event history's entries should currently be shown in the log. */
  visibleEventCount: number;
  /** True once every turn has been reviewed (continued past) — normal turn controls apply. */
  isCaughtUp: boolean;
  /** Index into `turnGroups` of the turn currently being reviewed, or null once caught up. */
  pendingTurnIndex: number | null;
}

/**
 * Both play modes pause after every turn — training mode to explain what the auto-notepad just
 * learned, normal mode to give the player time to update their own notes — so the reveal cursor
 * logic is identical either way; only the *content* shown during a pause differs by mode. The
 * pending turn's events are already included in `visibleEventCount` so the event log and its
 * explanation panel advance together, rather than the explanation appearing before its events do.
 *
 * `liveTurnIsIncomplete` covers the one case where the *last* group isn't actually a finished
 * turn to review yet: the server paused mid-turn waiting on the human's own disproval choice
 * (only its guess, and possibly some no_disproval events, exist so far). That group is excluded
 * from the backlog entirely — otherwise the player could never reach the disproval prompt, since
 * there'd always be one more "turn" pacing can never let them finish reviewing. Once the backlog
 * of genuinely complete turns is cleared, its (partial) events become visible immediately and
 * `isCaughtUp` flips true, unblocking the live disproval action.
 */
export function computeRevealState(
  events: readonly RedactedGameEvent[],
  revealedTurnCount: number,
  liveTurnIsIncomplete = false,
): RevealState {
  const turnGroups = groupEventsByTurn(events);
  const completeGroupCount = liveTurnIsIncomplete
    ? Math.max(turnGroups.length - 1, 0)
    : turnGroups.length;
  const isCaughtUp = revealedTurnCount >= completeGroupCount;
  const groupsToShow = isCaughtUp ? turnGroups.length : revealedTurnCount + 1;
  const visibleEventCount = turnGroups.slice(0, groupsToShow).reduce((n, g) => n + g.length, 0);
  return {
    turnGroups,
    visibleEventCount,
    isCaughtUp,
    pendingTurnIndex: isCaughtUp ? null : revealedTurnCount,
  };
}
