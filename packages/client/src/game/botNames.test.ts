import { describe, expect, it } from "vitest";
import { BOT_NICKNAME_POOL, pickNicknames } from "./botNames.js";

describe("pickNicknames", () => {
  it("returns the requested number of names, all drawn from the pool", () => {
    const picked = pickNicknames(2);
    expect(picked).toHaveLength(2);
    for (const name of picked) {
      expect(BOT_NICKNAME_POOL).toContain(name);
    }
  });

  it("never repeats a name within one draw", () => {
    // Draw close to the full pool repeatedly — any collision would show up quickly.
    for (let i = 0; i < 20; i++) {
      const picked = pickNicknames(BOT_NICKNAME_POOL.length);
      expect(new Set(picked).size).toBe(picked.length);
    }
  });

  it("has enough names that two consecutive draws are very unlikely to match", () => {
    expect(BOT_NICKNAME_POOL.length).toBeGreaterThanOrEqual(20);
  });

  it("returns an empty array when 0 names are requested", () => {
    expect(pickNicknames(0)).toEqual([]);
  });
});
