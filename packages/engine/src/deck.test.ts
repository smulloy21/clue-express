import { describe, expect, it } from "vitest";
import { ALL_CARDS, ROOMS, SUSPECTS, WEAPONS } from "./constants.js";
import { dealGame } from "./deck.js";
import { createRng } from "./rng.js";

describe("dealGame", () => {
  it("sets aside exactly one solution card per category", () => {
    const { solution } = dealGame(createRng(1));
    expect(SUSPECTS).toContain(solution.suspect);
    expect(WEAPONS).toContain(solution.weapon);
    expect(ROOMS).toContain(solution.room);
  });

  it("deals exactly 6 cards to each of 3 hands", () => {
    const { hands } = dealGame(createRng(2));
    expect(hands).toHaveLength(3);
    for (const hand of hands) {
      expect(hand).toHaveLength(6);
    }
  });

  it("deals the solution plus all hands as exactly the full 21-card deck with no overlap", () => {
    const { solution, hands } = dealGame(createRng(3));
    const dealtCards = [solution.suspect, solution.weapon, solution.room, ...hands.flat()];
    expect(new Set(dealtCards).size).toBe(21);
    expect(new Set(dealtCards)).toEqual(new Set(ALL_CARDS.map((c) => c.name)));
  });

  it("is deterministic for a given seed", () => {
    const a = dealGame(createRng(99));
    const b = dealGame(createRng(99));
    expect(a).toEqual(b);
  });

  it("produces a different deal for a different seed", () => {
    const a = dealGame(createRng(1));
    const b = dealGame(createRng(2));
    expect(a).not.toEqual(b);
  });
});
