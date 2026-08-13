import { describe, expect, it } from "vitest";
import { dailySeed } from "./dailySeed.js";

describe("dailySeed", () => {
  it("is deterministic for the same UTC calendar day", () => {
    const a = dailySeed(new Date("2026-03-05T01:00:00.000Z"));
    const b = dailySeed(new Date("2026-03-05T23:59:59.999Z"));
    expect(a).toBe(b);
  });

  it("differs across different UTC calendar days", () => {
    const day1 = dailySeed(new Date("2026-03-05T12:00:00.000Z"));
    const day2 = dailySeed(new Date("2026-03-06T12:00:00.000Z"));
    expect(day1).not.toBe(day2);
  });

  it("produces a non-negative integer within the engine's seed range", () => {
    for (const date of ["2026-01-01", "2026-06-15", "2026-12-31"]) {
      const seed = dailySeed(new Date(date));
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 31);
    }
  });
});
