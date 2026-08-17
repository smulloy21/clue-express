import type { RedactedGameEvent } from "@clue/engine";
import { describe, expect, it } from "vitest";
import { computeRevealState, groupEventsByTurn } from "./turns.js";

const guess = (seat: number, index: number): RedactedGameEvent => ({
  index,
  type: "guess",
  seat,
  guess: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
});
const noDisproval = (seat: number, index: number): RedactedGameEvent => ({
  index,
  type: "no_disproval",
  seat,
});

describe("groupEventsByTurn", () => {
  it("returns no groups for an empty history", () => {
    expect(groupEventsByTurn([])).toEqual([]);
  });

  it("groups one guess and its aftermath into a single turn", () => {
    const events = [guess(0, 0), noDisproval(1, 1), noDisproval(2, 2)];
    const groups = groupEventsByTurn(events);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(events);
  });

  it("starts a new group on each guess event", () => {
    const events = [guess(0, 0), noDisproval(1, 1), guess(1, 2), noDisproval(2, 3)];
    const groups = groupEventsByTurn(events);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual([events[0], events[1]]);
    expect(groups[1]).toEqual([events[2], events[3]]);
  });

  it("ignores any events before the first guess", () => {
    const events = [noDisproval(0, 0), guess(1, 1)];
    const groups = groupEventsByTurn(events);
    expect(groups).toEqual([[events[1]]]);
  });
});

describe("computeRevealState", () => {
  const events = [guess(0, 0), noDisproval(1, 1), guess(1, 2), noDisproval(2, 3)];

  it("at 0 revealed turns, shows only the first (pending) turn's events", () => {
    const result = computeRevealState(events, 0);
    expect(result.isCaughtUp).toBe(false);
    expect(result.pendingTurnIndex).toBe(0);
    expect(result.visibleEventCount).toBe(2);
  });

  it("mid-way, shows events through the current pending turn", () => {
    const result = computeRevealState(events, 1);
    expect(result.isCaughtUp).toBe(false);
    expect(result.pendingTurnIndex).toBe(1);
    expect(result.visibleEventCount).toBe(4);
  });

  it("once revealedTurnCount reaches the group count, is caught up", () => {
    const result = computeRevealState(events, 2);
    expect(result.isCaughtUp).toBe(true);
    expect(result.pendingTurnIndex).toBeNull();
    expect(result.visibleEventCount).toBe(4);
  });

  it("clamps to caught-up when revealedTurnCount overshoots", () => {
    const result = computeRevealState(events, 5);
    expect(result.isCaughtUp).toBe(true);
    expect(result.pendingTurnIndex).toBeNull();
    expect(result.visibleEventCount).toBe(4);
  });

  it("with no events at all, is immediately caught up", () => {
    const result = computeRevealState([], 0);
    expect(result.isCaughtUp).toBe(true);
    expect(result.visibleEventCount).toBe(0);
  });

  it("excludes a live, still-resolving last turn from the backlog", () => {
    // A bot's guess just landed and the human must choose a disproval — the guess event exists,
    // but nothing else does yet for this turn, and it must never require a phantom "Continue".
    const withLiveTurn = [...events, guess(2, 4)];
    const caughtUpOnPriorTurns = computeRevealState(withLiveTurn, 2, true);
    expect(caughtUpOnPriorTurns.isCaughtUp).toBe(true);
    expect(caughtUpOnPriorTurns.visibleEventCount).toBe(withLiveTurn.length);

    const stillBehind = computeRevealState(withLiveTurn, 0, true);
    expect(stillBehind.isCaughtUp).toBe(false);
    // The live turn's own (partial) events stay hidden until the backlog is cleared.
    expect(stillBehind.visibleEventCount).toBe(2);
  });
});
