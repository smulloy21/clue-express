import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./api/client.js";
import { App } from "./App.js";
import { useAuthStore } from "./store/authStore.js";
import { useGameStore } from "./store/gameStore.js";

describe("App", () => {
  beforeEach(() => {
    useAuthStore.setState({ auth: { status: "loading" }, error: null, isSubmitting: false });
    useGameStore.setState({
      gameId: null,
      state: null,
      visibleEventCount: 0,
      isRevealing: false,
      isSubmitting: false,
      actionError: null,
      revealToken: 0,
    });
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
      isRevealing: false,
    });

    expect(await screen.findByText("Your hand")).toBeInTheDocument();
  });
});
