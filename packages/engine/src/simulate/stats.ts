import type { BotDifficulty } from "../types.js";
import type { SimulatedGameResult } from "./runGame.js";

export interface SimulationSummary {
  games: number;
  noWinner: number;
  averageTurnCount: number;
  averageEventCount: number;
  /** Win count and win rate for each bot difficulty, aggregated across every seat that used it. */
  winsByDifficulty: Record<BotDifficulty, { wins: number; appearances: number; winRate: number }>;
}

export function summarize(results: readonly SimulatedGameResult[]): SimulationSummary {
  const games = results.length;
  const noWinner = results.filter((r) => r.winnerSeat === null).length;
  const averageTurnCount =
    games === 0 ? 0 : results.reduce((sum, r) => sum + r.turnCount, 0) / games;
  const averageEventCount =
    games === 0 ? 0 : results.reduce((sum, r) => sum + r.eventCount, 0) / games;

  const difficulties: BotDifficulty[] = ["easy", "hard"];
  const winsByDifficulty = Object.fromEntries(
    difficulties.map((difficulty) => {
      const appearances = results.reduce(
        (count, r) => count + r.difficulties.filter((d) => d === difficulty).length,
        0,
      );
      const wins = results.filter((r) => r.winnerDifficulty === difficulty).length;
      return [
        difficulty,
        { wins, appearances, winRate: appearances === 0 ? 0 : wins / appearances },
      ];
    }),
  ) as SimulationSummary["winsByDifficulty"];

  return { games, noWinner, averageTurnCount, averageEventCount, winsByDifficulty };
}
