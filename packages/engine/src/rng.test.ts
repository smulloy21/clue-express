import { describe, expect, it } from "vitest";
import { createRng, shuffle } from "./rng.js";

describe("createRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  it("returns a permutation containing exactly the same elements", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle(input, createRng(123));
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input, createRng(9));
    expect(input).toEqual(copy);
  });

  it("is deterministic for a given seed", () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const resultA = shuffle(input, createRng(55));
    const resultB = shuffle(input, createRng(55));
    expect(resultA).toEqual(resultB);
  });

  it("actually reorders elements for a non-trivial input", () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const result = shuffle(input, createRng(55));
    expect(result).not.toEqual(input);
  });
});
