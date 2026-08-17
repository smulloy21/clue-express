import type { RedactedGameState } from "@clue/engine";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/client.js";
import { BOT_NICKNAME_POOL } from "../game/botNames.js";
import { useAuthStore } from "../store/authStore.js";
import { useBotNameStore } from "../store/botNameStore.js";
import { useGameStore } from "../store/gameStore.js";
import { useNotepadStore } from "../store/notepadStore.js";
import { NewGameScreen } from "./NewGameScreen.js";

function makeState(overrides: Partial<RedactedGameState> = {}): RedactedGameState {
  return {
    viewerSeat: 0,
    status: "in_progress",
    players: [
      { seat: 0, type: "human", eliminated: false, handSize: 6, hand: ["Miss Scarlet"] },
      { seat: 1, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
      { seat: 2, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
    ],
    turn: { currentSeat: 0, phase: "guess" },
    winnerSeat: null,
    events: [],
    ...overrides,
  };
}

describe("NewGameScreen", () => {
  beforeEach(() => {
    useAuthStore.setState({ auth: { status: "guest" }, error: null, isSubmitting: false });
    useGameStore.setState({ gameId: null, state: null, isSubmitting: false, actionError: null });
    useNotepadStore.getState().reset();
    useBotNameStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts a game with the chosen difficulties and daily flag unset by default", async () => {
    const createSpy = vi
      .spyOn(api, "createGame")
      .mockResolvedValue({ gameId: "g1", state: makeState() });
    render(<NewGameScreen onViewRecords={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(createSpy).toHaveBeenCalledWith(["easy", "hard"], false);
  });

  it("passes daily: true when the checkbox is checked", async () => {
    const createSpy = vi
      .spyOn(api, "createGame")
      .mockResolvedValue({ gameId: "g1", state: makeState() });
    render(<NewGameScreen onViewRecords={vi.fn()} />);

    await userEvent.click(screen.getByLabelText(/daily challenge/i));
    await userEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(createSpy).toHaveBeenCalledWith(["easy", "hard"], true);
  });

  it("seeds the notepad store for normal mode (the default) with the dealt hand prefilled", async () => {
    vi.spyOn(api, "createGame").mockResolvedValue({ gameId: "g1", state: makeState() });
    render(<NewGameScreen onViewRecords={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(useNotepadStore.getState().mode).toBe("normal");
    expect(useNotepadStore.getState().manualNotes!["Miss Scarlet"]!["0"]).toBe("yes");
  });

  it("seeds the notepad store for training mode when explicitly selected", async () => {
    vi.spyOn(api, "createGame").mockResolvedValue({ gameId: "g1", state: makeState() });
    render(<NewGameScreen onViewRecords={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText("Mode"), "training");
    await userEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(useNotepadStore.getState().mode).toBe("training");
    expect(useNotepadStore.getState().manualNotes).toBeNull();
    expect(useNotepadStore.getState().revealedTurnCount).toBe(0);
  });

  it("assigns each bot seat a distinct nickname from the pool after starting", async () => {
    vi.spyOn(api, "createGame").mockResolvedValue({ gameId: "g1", state: makeState() });
    render(<NewGameScreen onViewRecords={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Start game" }));

    const { nicknames } = useBotNameStore.getState();
    expect(Object.keys(nicknames)).toEqual(["1", "2"]);
    expect(BOT_NICKNAME_POOL).toContain(nicknames[1]);
    expect(BOT_NICKNAME_POOL).toContain(nicknames[2]);
    expect(nicknames[1]).not.toBe(nicknames[2]);
  });

  it("opens and closes the how-to-play modal", async () => {
    render(<NewGameScreen onViewRecords={vi.fn()} />);

    expect(screen.queryByText("How to play", { selector: "h3" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "How to play" }));
    expect(screen.getByText("How to play", { selector: "h3" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByText("How to play", { selector: "h3" })).not.toBeInTheDocument();
  });
});
