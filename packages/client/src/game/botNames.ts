/**
 * Short, memorable stand-ins for "Bot 0"/"Bot 2" — deliberately not suspect names (those are
 * already cards) and not colors (already used for the suspect/weapon/room category dots).
 * A largish pool keeps repeat games from feeling like the same two bots every time.
 */
export const BOT_NICKNAME_POOL: readonly string[] = [
  "Ace",
  "Blaze",
  "Cipher",
  "Dash",
  "Echo",
  "Flint",
  "Gizmo",
  "Hawk",
  "Jester",
  "Kilo",
  "Lynx",
  "Milo",
  "Nomad",
  "Piper",
  "Quill",
  "Raven",
  "Talon",
  "Vex",
  "Wren",
  "Zephyr",
  "Bramble",
  "Cricket",
  "Drift",
  "Ember",
  "Frost",
  "Gale",
  "Juno",
  "Koda",
  "Nash",
  "Orbit",
  "Pixel",
  "Quake",
  "Rune",
  "Scout",
  "Tango",
  "Vapor",
  "Whistle",
  "Zigzag",
];

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Picks `count` distinct nicknames at random from the pool — no repeats within one draw. */
export function pickNicknames(count: number): string[] {
  return shuffle(BOT_NICKNAME_POOL).slice(0, count);
}
