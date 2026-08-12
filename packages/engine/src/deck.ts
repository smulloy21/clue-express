import { ROOMS, SUSPECTS, WEAPONS, type CardName } from "./constants.js";
import { shuffle, type Rng } from "./rng.js";
import type { Solution } from "./types.js";

export interface Deal {
  solution: Solution;
  hands: [CardName[], CardName[], CardName[]];
}

/** Sets aside one solution card per category, then deals the remaining 18 evenly across 3 hands. */
export function dealGame(rng: Rng): Deal {
  const suspect = shuffle(SUSPECTS, rng)[0]!;
  const weapon = shuffle(WEAPONS, rng)[0]!;
  const room = shuffle(ROOMS, rng)[0]!;

  const remaining: CardName[] = shuffle(
    [
      ...SUSPECTS.filter((s) => s !== suspect),
      ...WEAPONS.filter((w) => w !== weapon),
      ...ROOMS.filter((r) => r !== room),
    ],
    rng,
  );

  const hands: [CardName[], CardName[], CardName[]] = [
    remaining.slice(0, 6),
    remaining.slice(6, 12),
    remaining.slice(12, 18),
  ];

  return { solution: { suspect, weapon, room }, hands };
}
