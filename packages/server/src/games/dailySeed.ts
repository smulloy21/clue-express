import { createHash } from "node:crypto";

/**
 * A deterministic seed for a given UTC calendar day, so every player who opts into "today's
 * challenge" gets the identical deal/solution — comparable, like a daily puzzle.
 */
export function dailySeed(date: Date = new Date()): number {
  const dateKey = date.toISOString().slice(0, 10); // YYYY-MM-DD, UTC
  const hash = createHash("sha256").update(`clue-daily:${dateKey}`).digest();
  return hash.readUInt32BE(0) % (2 ** 31 - 1);
}
