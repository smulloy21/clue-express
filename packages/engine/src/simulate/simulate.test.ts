import { describe, expect, it } from "vitest";
import { playOneGame } from "./runGame.js";
import { summarize } from "./stats.js";

const GAMES = 150;

describe("hard bot vs easy bot", () => {
  it("reliably beats easy over many games", () => {
    const results = Array.from({ length: GAMES }, (_, i) =>
      playOneGame(1000 + i, ["hard", "easy", "easy"]),
    );
    const summary = summarize(results);

    expect(summary.winsByDifficulty.hard.winRate).toBeGreaterThan(
      summary.winsByDifficulty.easy.winRate,
    );
    expect(summary.winsByDifficulty.hard.winRate).toBeGreaterThan(0.6);
  });

  it("shows no seat/positional bias between symmetric difficulties", () => {
    const easyResults = Array.from({ length: GAMES }, (_, i) =>
      playOneGame(2000 + i, ["easy", "easy", "easy"]),
    );
    const easySummary = summarize(easyResults);
    expect(easySummary.winsByDifficulty.easy.winRate).toBeCloseTo(1 / 3, 1);

    const hardResults = Array.from({ length: GAMES }, (_, i) =>
      playOneGame(3000 + i, ["hard", "hard", "hard"]),
    );
    const hardSummary = summarize(hardResults);
    expect(hardSummary.winsByDifficulty.hard.winRate).toBeCloseTo(1 / 3, 1);
  });
});
