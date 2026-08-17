import type { RedactedGameState } from "@clue/engine";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../store/authStore.js";
import { useBotNameStore } from "../store/botNameStore.js";
import { useGameStore } from "../store/gameStore.js";
import { GameOverScreen } from "./GameOverScreen.js";

function makeFinishedState(overrides: Partial<RedactedGameState> = {}): RedactedGameState {
  return {
    viewerSeat: 0,
    status: "finished",
    solution: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
    players: [
      { seat: 0, type: "human", eliminated: false, handSize: 6, hand: ["Miss Scarlet"] },
      { seat: 1, type: "bot", difficulty: "hard", eliminated: false, handSize: 6 },
      { seat: 2, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
    ],
    turn: { currentSeat: 0, phase: "accuse_or_pass" },
    winnerSeat: 1,
    events: [],
    ...overrides,
  };
}

describe("GameOverScreen", () => {
  beforeEach(() => {
    useAuthStore.setState({ auth: { status: "guest" }, error: null, isSubmitting: false });
    useBotNameStore.getState().reset();
  });

  it("shows the winning bot's assigned nickname instead of a numbered label", () => {
    useGameStore.setState({ gameId: "g1", state: makeFinishedState() });
    useBotNameStore.getState().assignNicknames([1, 2]);
    const nickname = useBotNameStore.getState().nicknames[1];

    render(<GameOverScreen onPlayAgain={vi.fn()} onSignUp={vi.fn()} />);

    expect(screen.getByText(`${nickname} (hard) solved the case and wins.`)).toBeInTheDocument();
  });

  it("falls back to a numbered label when no nickname was assigned", () => {
    useGameStore.setState({ gameId: "g1", state: makeFinishedState() });

    render(<GameOverScreen onPlayAgain={vi.fn()} onSignUp={vi.fn()} />);

    expect(screen.getByText("Bot 1 (hard) solved the case and wins.")).toBeInTheDocument();
  });
});
