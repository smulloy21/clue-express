import { describe, expect, it } from "vitest";
import type { SimulatedGameResult } from "./runGame.js";
import { summarize } from "./stats.js";

function fakeResult(overrides: Partial<SimulatedGameResult>): SimulatedGameResult {
  return {
    seed: 0,
    difficulties: ["hard", "easy", "easy"],
    winnerSeat: 0,
    winnerDifficulty: "hard",
    reason: "correct_accusation",
    turnCount: 10,
    eventCount: 30,
    ...overrides,
  };
}

describe("summarize", () => {
  it("computes per-difficulty win rate normalized by seat appearances", () => {
    const results = [
      fakeResult({ winnerSeat: 0, winnerDifficulty: "hard" }),
      fakeResult({ winnerSeat: 0, winnerDifficulty: "hard" }),
      fakeResult({ winnerSeat: 1, winnerDifficulty: "easy" }),
    ];
    const summary = summarize(results);

    expect(summary.games).toBe(3);
    // hard appears once per game (seat 0) -> 3 appearances, 2 wins.
    expect(summary.winsByDifficulty.hard).toEqual({ wins: 2, appearances: 3, winRate: 2 / 3 });
    // easy appears twice per game (seats 1 and 2) -> 6 appearances, 1 win.
    expect(summary.winsByDifficulty.easy).toEqual({ wins: 1, appearances: 6, winRate: 1 / 6 });
  });

  it("counts games with no winner", () => {
    const results = [
      fakeResult({ winnerSeat: null, winnerDifficulty: null, reason: "all_eliminated" }),
      fakeResult({ winnerSeat: 0, winnerDifficulty: "hard" }),
    ];
    const summary = summarize(results);
    expect(summary.noWinner).toBe(1);
  });

  it("averages turn and event counts", () => {
    const results = [
      fakeResult({ turnCount: 10, eventCount: 30 }),
      fakeResult({ turnCount: 20, eventCount: 50 }),
    ];
    const summary = summarize(results);
    expect(summary.averageTurnCount).toBe(15);
    expect(summary.averageEventCount).toBe(40);
  });

  it("handles an empty result set without dividing by zero", () => {
    const summary = summarize([]);
    expect(summary.games).toBe(0);
    expect(summary.averageTurnCount).toBe(0);
    expect(summary.averageEventCount).toBe(0);
    expect(summary.winsByDifficulty.hard.winRate).toBe(0);
    expect(summary.winsByDifficulty.easy.winRate).toBe(0);
  });
});
