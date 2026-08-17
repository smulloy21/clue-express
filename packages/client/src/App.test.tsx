import type { RedactedGameEvent } from "@clue/engine";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./api/client.js";
import { App } from "./App.js";
import { useAuthStore } from "./store/authStore.js";
import { useGameStore } from "./store/gameStore.js";
import { useNotepadStore } from "./store/notepadStore.js";

describe("App", () => {
  beforeEach(() => {
    useAuthStore.setState({ auth: { status: "loading" }, error: null, isSubmitting: false });
    useGameStore.setState({ gameId: null, state: null, isSubmitting: false, actionError: null });
    useNotepadStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state before the auth check resolves", () => {
    vi.spyOn(api, "getMe").mockImplementation(() => new Promise(() => {}));
    render(<App />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the landing screen once resolved as anonymous", async () => {
    vi.spyOn(api, "getMe").mockResolvedValue({ authenticated: false });
    render(<App />);
    expect(await screen.findByText("Clue Express")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play as guest" })).toBeInTheDocument();
  });

  it("shows the new game screen once resolved as a guest", async () => {
    vi.spyOn(api, "getMe").mockResolvedValue({ authenticated: true, guest: true });
    render(<App />);
    expect(await screen.findByText("New game")).toBeInTheDocument();
    expect(screen.getByText(/playing as guest/i)).toBeInTheDocument();
  });

  it("shows the new game screen and username once resolved as authenticated", async () => {
    vi.spyOn(api, "getMe").mockResolvedValue({
      authenticated: true,
      guest: false,
      id: "u1",
      username: "alice",
    });
    render(<App />);
    expect(await screen.findByText("New game")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("shows the game table once a game is active", async () => {
    vi.spyOn(api, "getMe").mockResolvedValue({ authenticated: true, guest: true });
    render(<App />);
    await screen.findByText("New game");

    useGameStore.setState({
      gameId: "g1",
      state: {
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
      },
    });

    expect(await screen.findByText("Your hand")).toBeInTheDocument();
  });

  it("keeps showing the game table on a finished game until the final turn's backlog is caught up", async () => {
    vi.spyOn(api, "getMe").mockResolvedValue({ authenticated: true, guest: true });
    render(<App />);
    await screen.findByText("New game");

    const events: RedactedGameEvent[] = [
      {
        index: 0,
        type: "guess",
        seat: 0,
        guess: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
      },
      {
        index: 1,
        type: "accusation",
        seat: 0,
        accusation: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
        correct: true,
      },
      {
        index: 2,
        type: "game_over",
        winnerSeat: 0,
        reason: "correct_accusation",
        solution: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
      },
    ];
    useGameStore.setState({
      gameId: "g1",
      state: {
        viewerSeat: 0,
        status: "finished",
        solution: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
        players: [
          { seat: 0, type: "human", eliminated: false, handSize: 6, hand: ["Miss Scarlet"] },
          { seat: 1, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
          { seat: 2, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
        ],
        turn: { currentSeat: 0, phase: "accuse_or_pass" },
        winnerSeat: 0,
        events,
      },
    });

    // Not yet caught up (revealedTurnCount defaults to 0) — the table, not the result, shows.
    expect(await screen.findByText("Your hand")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Game over" })).not.toBeInTheDocument();

    useNotepadStore.setState({ revealedTurnCount: 1 });

    expect(await screen.findByRole("heading", { name: "Game over" })).toBeInTheDocument();
  });
});
