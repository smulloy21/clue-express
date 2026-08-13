import {
  createBotAgent,
  decideAccusation,
  decideDisproval,
  decideGuess,
  observeEvent,
  type BotAgentState,
} from "../bots/agent.js";
import { accuse, createGame, pass, resolveDisproval, submitGuess } from "../game.js";
import { redactStateForPlayer } from "../redact.js";
import { createRng } from "../rng.js";
import type { BotDifficulty, GameOverReason, GameState, PlayerConfig } from "../types.js";

export interface SimulatedGameResult {
  seed: number;
  difficulties: readonly [BotDifficulty, BotDifficulty, BotDifficulty];
  winnerSeat: number | null;
  winnerDifficulty: BotDifficulty | null;
  reason: GameOverReason;
  turnCount: number;
  eventCount: number;
}

const MAX_EVENTS = 5000;

/** Plays one full 3-bot game headlessly, driving every decision through the bot agents. */
export function playOneGame(
  seed: number,
  difficulties: readonly [BotDifficulty, BotDifficulty, BotDifficulty],
): SimulatedGameResult {
  const players: PlayerConfig[] = difficulties.map((difficulty) => ({ type: "bot", difficulty }));
  let state = createGame({ seed, players });

  let agents: BotAgentState[] = state.players.map((player, seat) =>
    createBotAgent(
      seat,
      player.difficulty!,
      player.hand,
      state.players.length,
      createRng(seed + 1 + seat),
    ),
  );
  const observedCount: number[] = agents.map(() => 0);

  const syncAgents = (nextState: GameState): void => {
    agents = agents.map((agent, seat) => {
      const redacted = redactStateForPlayer(nextState, seat);
      let updated = agent;
      for (let i = observedCount[seat]!; i < redacted.events.length; i++) {
        updated = observeEvent(updated, redacted.events[i]!);
      }
      observedCount[seat] = redacted.events.length;
      return updated;
    });
  };

  let turnCount = 0;
  while (state.status === "in_progress") {
    if (state.events.length > MAX_EVENTS) {
      throw new Error(
        `simulation exceeded ${MAX_EVENTS} events (seed=${seed}); likely stuck in a loop`,
      );
    }

    if (state.turn.phase === "guess") {
      const seat = state.turn.currentSeat;
      state = submitGuess(state, seat, decideGuess(agents[seat]!));
      turnCount++;
    } else if (state.turn.phase === "awaiting_disproval") {
      const pending = state.turn.pending!;
      const card = decideDisproval(agents[pending.disproverSeat]!, pending.options);
      state = resolveDisproval(state, pending.disproverSeat, card);
    } else {
      const seat = state.turn.currentSeat;
      const accusation = decideAccusation(agents[seat]!);
      state = accusation ? accuse(state, seat, accusation) : pass(state, seat);
    }
    syncAgents(state);
  }

  const lastEvent = state.events.at(-1);
  const reason: GameOverReason =
    lastEvent && lastEvent.type === "game_over" ? lastEvent.reason : "all_eliminated";
  const winnerDifficulty =
    state.winnerSeat === null ? null : (state.players[state.winnerSeat]!.difficulty ?? null);

  return {
    seed,
    difficulties,
    winnerSeat: state.winnerSeat,
    winnerDifficulty,
    reason,
    turnCount,
    eventCount: state.events.length,
  };
}
