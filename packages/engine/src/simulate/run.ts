import type { BotDifficulty } from "../types.js";
import { playOneGame } from "./runGame.js";
import { summarize } from "./stats.js";

function parseDifficulty(value: string | undefined, flag: string): BotDifficulty {
  if (value === "easy" || value === "hard") {
    return value;
  }
  throw new Error(`${flag} must be "easy" or "hard" (got ${value ?? "<missing>"})`);
}

function parseArgs(argv: readonly string[]): {
  games: number;
  seed: number;
  difficulties: [BotDifficulty, BotDifficulty, BotDifficulty];
} {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg?.startsWith("--")) {
      flags.set(arg.slice(2), argv[i + 1] ?? "");
      i++;
    }
  }

  return {
    games: Number(flags.get("games") ?? "100"),
    seed: Number(flags.get("seed") ?? "1"),
    difficulties: [
      parseDifficulty(flags.get("p1") ?? "hard", "--p1"),
      parseDifficulty(flags.get("p2") ?? "easy", "--p2"),
      parseDifficulty(flags.get("p3") ?? "easy", "--p3"),
    ],
  };
}

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

export function runCli(argv: readonly string[]): void {
  const { games, seed, difficulties } = parseArgs(argv);

  const results = Array.from({ length: games }, (_, i) => playOneGame(seed + i, difficulties));
  const summary = summarize(results);

  console.log(`Simulated ${summary.games} games — seats: ${difficulties.join(", ")}`);
  console.log(`  average turns per game:  ${summary.averageTurnCount.toFixed(1)}`);
  console.log(`  average events per game: ${summary.averageEventCount.toFixed(1)}`);
  console.log(
    `  games with no winner:    ${summary.noWinner} (${formatPercent(summary.noWinner / summary.games)})`,
  );
  console.log("  win rate by difficulty (per seat-appearance):");
  for (const [difficulty, { wins, appearances, winRate }] of Object.entries(
    summary.winsByDifficulty,
  )) {
    console.log(`    ${difficulty.padEnd(4)}: ${wins}/${appearances} (${formatPercent(winRate)})`);
  }
}

const isMainModule =
  process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMainModule) {
  runCli(process.argv.slice(2));
}
