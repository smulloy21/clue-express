import { describe, expect, it } from "vitest";
import { playOneGame } from "./runGame.js";

describe("playOneGame", () => {
  it("terminates and produces a consistent result across a spread of seeds", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const result = playOneGame(seed, ["hard", "easy", "easy"]);
      expect(result.turnCount).toBeGreaterThan(0);
      expect(result.eventCount).toBeGreaterThan(0);
      if (result.winnerSeat === null) {
        expect(result.reason).not.toBe("correct_accusation");
      } else {
        expect(result.reason).toBe("correct_accusation");
        expect(result.winnerDifficulty).not.toBeNull();
      }
    }
  });

  it("is deterministic for a given seed and difficulty configuration", () => {
    const a = playOneGame(42, ["hard", "easy", "easy"]);
    const b = playOneGame(42, ["hard", "easy", "easy"]);
    expect(a).toEqual(b);
  });

  it("produces a different game for a different seed", () => {
    const a = playOneGame(1, ["hard", "easy", "easy"]);
    const b = playOneGame(2, ["hard", "easy", "easy"]);
    expect(a).not.toEqual(b);
  });
});
