import type { RedactedGameEvent, RedactedGameState } from "@clue/engine";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useBotNameStore } from "../store/botNameStore.js";
import { useGameStore } from "../store/gameStore.js";
import { useNotepadStore } from "../store/notepadStore.js";
import { GameTableScreen } from "./GameTableScreen.js";

function makeState(overrides: Partial<RedactedGameState> = {}): RedactedGameState {
  return {
    viewerSeat: 0,
    status: "in_progress",
    players: [
      { seat: 0, type: "human", eliminated: false, handSize: 6, hand: ["Miss Scarlet"] },
      { seat: 1, type: "bot", difficulty: "hard", eliminated: false, handSize: 6 },
      { seat: 2, type: "bot", difficulty: "hard", eliminated: false, handSize: 6 },
    ],
    turn: { currentSeat: 0, phase: "guess" },
    winnerSeat: null,
    events: [],
    ...overrides,
  };
}

const guess = (index: number, seat: number): RedactedGameEvent => ({
  index,
  type: "guess",
  seat,
  guess: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
});
const noDisproval = (index: number, seat: number): RedactedGameEvent => ({
  index,
  type: "no_disproval",
  seat,
});

describe("GameTableScreen", () => {
  beforeEach(() => {
    useGameStore.setState({ gameId: "g1", state: null, isSubmitting: false, actionError: null });
    useNotepadStore.getState().reset();
    useBotNameStore.getState().reset();
  });

  it.each(["training", "normal"] as const)(
    "%s mode pauses after a turn and hides turn controls until continued",
    async (mode) => {
      const events = [guess(0, 0), noDisproval(1, 1), noDisproval(2, 2)];
      useGameStore.setState({
        state: makeState({ events, turn: { currentSeat: 0, phase: "accuse_or_pass" } }),
      });
      useNotepadStore.getState().startNewGame(0, 3, ["Miss Scarlet"], mode);

      render(<GameTableScreen />);

      expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Pass" })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Pass" })).toBeInTheDocument();
    },
  );

  it("training mode's pause shows the computed explanation; normal mode's shows a plain prompt", () => {
    const events = [guess(0, 0), noDisproval(1, 1), noDisproval(2, 2)];
    useGameStore.setState({
      state: makeState({ events, turn: { currentSeat: 0, phase: "accuse_or_pass" } }),
    });

    useNotepadStore.getState().startNewGame(0, 3, ["Miss Scarlet"], "training");
    const { unmount } = render(<GameTableScreen />);
    expect(screen.getByText("Directly observed")).toBeInTheDocument();
    unmount();

    useNotepadStore.getState().startNewGame(0, 3, ["Miss Scarlet"], "normal");
    render(<GameTableScreen />);
    expect(screen.getByText("Update your notes, then continue.")).toBeInTheDocument();
  });

  it("regression: a finished game's stale turn state never re-shows accuse/pass controls", () => {
    const events = [guess(0, 0), noDisproval(1, 1), noDisproval(2, 2)];
    // accuse() never clears `turn` on a game-ending path, so this stays stuck at
    // accuse_or_pass/currentSeat 0 even though the game is over.
    useGameStore.setState({
      state: makeState({
        status: "finished",
        winnerSeat: 0,
        events,
        turn: { currentSeat: 0, phase: "accuse_or_pass" },
      }),
    });
    useNotepadStore.setState({ mode: "training", revealedTurnCount: 1 });

    render(<GameTableScreen />);

    expect(screen.queryByRole("button", { name: "Pass" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Make final accusation…" }),
    ).not.toBeInTheDocument();
  });

  it("shows a neutral catching-up banner while behind, instead of the live turn banner", () => {
    const events = [guess(0, 1), noDisproval(1, 2), noDisproval(2, 0)];
    useGameStore.setState({
      state: makeState({ events, turn: { currentSeat: 1, phase: "accuse_or_pass" } }),
    });
    useNotepadStore.getState().startNewGame(0, 3, ["Miss Scarlet"], "training");

    render(<GameTableScreen />);
    expect(screen.getByText("Catching up on previous turns…")).toBeInTheDocument();
  });

  it("shows assigned bot nicknames instead of numbered labels wherever players are named", () => {
    useGameStore.setState({
      state: makeState({ turn: { currentSeat: 1, phase: "guess" } }),
    });
    useNotepadStore.getState().startNewGame(0, 3, ["Miss Scarlet"], "training");
    useBotNameStore.getState().assignNicknames([1, 2]);
    const { nicknames } = useBotNameStore.getState();

    render(<GameTableScreen />);

    expect(screen.getByText(`Waiting on ${nicknames[1]} (hard)…`)).toBeInTheDocument();
    expect(screen.getByText(`${nicknames[1]} (hard)`)).toBeInTheDocument();
    expect(screen.getByText(`${nicknames[2]} (hard)`)).toBeInTheDocument();
    expect(screen.queryByText(/Bot 1|Bot 2/)).not.toBeInTheDocument();
  });

  it("keeps the disproval panel hidden behind backlog, then shows it once caught up", async () => {
    const events: RedactedGameEvent[] = [
      guess(0, 1),
      noDisproval(1, 2),
      noDisproval(2, 0),
      guess(3, 1),
    ];
    useGameStore.setState({
      state: makeState({
        events,
        turn: {
          currentSeat: 1,
          phase: "awaiting_disproval",
          pending: { guesserSeat: 1, disproverSeat: 0, options: ["Miss Scarlet"] },
        },
      }),
    });
    useNotepadStore.getState().startNewGame(0, 3, ["Miss Scarlet"], "training");

    render(<GameTableScreen />);
    expect(screen.queryByText("Choose a card to show")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Choose a card to show")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });
});
