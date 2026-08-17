import type { RedactedGameState } from "@clue/engine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/client.js";
import { useAuthStore } from "./authStore.js";
import { useGameStore } from "./gameStore.js";

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

describe("gameStore", () => {
  beforeEach(() => {
    useGameStore.setState({ gameId: null, state: null, isSubmitting: false, actionError: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("startGame stores the game and its full state immediately", async () => {
    const events = [
      { index: 0, type: "no_disproval" as const, seat: 1 },
      { index: 1, type: "no_disproval" as const, seat: 2 },
    ];
    vi.spyOn(api, "createGame").mockResolvedValue({ gameId: "g1", state: makeState({ events }) });

    const ok = await useGameStore.getState().startGame(["easy", "hard"]);

    expect(ok).toBe(true);
    expect(useGameStore.getState().gameId).toBe("g1");
    expect(useGameStore.getState().state?.events).toEqual(events);
  });

  it("guess/pass/disprove/accuse apply the new state immediately, with no artificial delay", async () => {
    vi.spyOn(api, "createGame").mockResolvedValue({
      gameId: "g1",
      state: makeState({ events: [] }),
    });
    await useGameStore.getState().startGame(["easy", "easy"]);

    const nextEvents = [{ index: 0, type: "pass" as const, seat: 0 }];
    vi.spyOn(api, "submitPass").mockResolvedValue({ state: makeState({ events: nextEvents }) });
    await useGameStore.getState().pass();

    expect(useGameStore.getState().state?.events).toEqual(nextEvents);
  });

  it("guess/pass/disprove/accuse set a friendly error and leave state untouched on failure", async () => {
    vi.spyOn(api, "createGame").mockResolvedValue({
      gameId: "g1",
      state: makeState({ events: [] }),
    });
    await useGameStore.getState().startGame(["easy", "easy"]);

    vi.spyOn(api, "submitPass").mockRejectedValue(
      new api.ApiError(409, { error: "game_not_active" }),
    );
    await useGameStore.getState().pass();

    expect(useGameStore.getState().actionError).toBe("This game has already ended.");
    expect(useGameStore.getState().gameId).toBe("g1");
  });

  it("reset clears the game", async () => {
    vi.spyOn(api, "createGame").mockResolvedValue({
      gameId: "g1",
      state: makeState({ events: [] }),
    });
    await useGameStore.getState().startGame(["easy", "easy"]);

    useGameStore.getState().reset();

    expect(useGameStore.getState().state).toBeNull();
    expect(useGameStore.getState().gameId).toBeNull();
  });

  it("passes the daily flag through to the API", async () => {
    const createSpy = vi
      .spyOn(api, "createGame")
      .mockResolvedValue({ gameId: "g1", state: makeState({ events: [] }) });
    await useGameStore.getState().startGame(["easy", "hard"], true);
    expect(createSpy).toHaveBeenCalledWith(["easy", "hard"], true);
  });

  it("on session expiry, clears the game and signs the user out locally", async () => {
    vi.spyOn(api, "createGame").mockResolvedValue({
      gameId: "g1",
      state: makeState({ events: [] }),
    });
    await useGameStore.getState().startGame(["easy", "easy"]);
    useAuthStore.setState({ auth: { status: "guest" }, error: null, isSubmitting: false });

    vi.spyOn(api, "submitPass").mockRejectedValue(
      new api.ApiError(401, { error: "unauthenticated" }),
    );
    await useGameStore.getState().pass();

    expect(useGameStore.getState().gameId).toBeNull();
    expect(useGameStore.getState().state).toBeNull();
    expect(useGameStore.getState().actionError).toBe(
      "Your session has expired. Please log in again.",
    );
    expect(useAuthStore.getState().auth).toEqual({ status: "anonymous" });
  });

  it("clears a stale game when the server reports it no longer exists", async () => {
    vi.spyOn(api, "createGame").mockResolvedValue({
      gameId: "g1",
      state: makeState({ events: [] }),
    });
    await useGameStore.getState().startGame(["easy", "easy"]);

    vi.spyOn(api, "submitPass").mockRejectedValue(
      new api.ApiError(404, { error: "game_not_found" }),
    );
    await useGameStore.getState().pass();

    expect(useGameStore.getState().gameId).toBeNull();
    expect(useGameStore.getState().state).toBeNull();
    expect(useGameStore.getState().actionError).toBe("This game is no longer available.");
  });
});
