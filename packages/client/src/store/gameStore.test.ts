import type { RedactedGameEvent, RedactedGameState } from "@clue/engine";
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
    vi.useFakeTimers();
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
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("startGame stores the game and reveals immediately when there are no events", async () => {
    vi.spyOn(api, "createGame").mockResolvedValue({
      gameId: "g1",
      state: makeState({ events: [] }),
    });

    const ok = await useGameStore.getState().startGame(["easy", "hard"]);

    expect(ok).toBe(true);
    expect(useGameStore.getState().gameId).toBe("g1");
    expect(useGameStore.getState().isRevealing).toBe(false);
    expect(useGameStore.getState().visibleEventCount).toBe(0);
  });

  it("paces revealing events one at a time", async () => {
    const events: RedactedGameEvent[] = [
      {
        index: 0,
        type: "guess",
        seat: 0,
        guess: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
      },
      { index: 1, type: "no_disproval", seat: 1 },
      { index: 2, type: "no_disproval", seat: 2 },
    ];
    vi.spyOn(api, "createGame").mockResolvedValue({
      gameId: "g1",
      state: makeState({ events, turn: { currentSeat: 0, phase: "accuse_or_pass" } }),
    });

    await useGameStore.getState().startGame(["easy", "hard"]);

    expect(useGameStore.getState().isRevealing).toBe(true);
    expect(useGameStore.getState().visibleEventCount).toBe(0);

    await vi.advanceTimersByTimeAsync(500);
    expect(useGameStore.getState().visibleEventCount).toBe(1);
    expect(useGameStore.getState().isRevealing).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    expect(useGameStore.getState().visibleEventCount).toBe(2);

    await vi.advanceTimersByTimeAsync(500);
    expect(useGameStore.getState().visibleEventCount).toBe(3);
    expect(useGameStore.getState().isRevealing).toBe(false);
  });

  it("a new action supersedes any in-flight reveal from the previous state", async () => {
    const firstEvents = [
      { index: 0, type: "no_disproval" as const, seat: 1 },
      { index: 1, type: "no_disproval" as const, seat: 2 },
    ];
    vi.spyOn(api, "createGame").mockResolvedValue({
      gameId: "g1",
      state: makeState({ events: firstEvents, turn: { currentSeat: 0, phase: "accuse_or_pass" } }),
    });
    await useGameStore.getState().startGame(["easy", "easy"]);
    expect(useGameStore.getState().isRevealing).toBe(true);

    const secondEvents = [{ index: 0, type: "pass" as const, seat: 0 }];
    vi.spyOn(api, "submitPass").mockResolvedValue({ state: makeState({ events: secondEvents }) });
    await useGameStore.getState().pass();

    // The reveal loop scheduled from the first (now-stale) state should not keep incrementing.
    await vi.advanceTimersByTimeAsync(2000);
    expect(useGameStore.getState().visibleEventCount).toBe(1);
    expect(useGameStore.getState().isRevealing).toBe(false);
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

  it("reset clears the game and stops any pending reveal", async () => {
    const events = [{ index: 0, type: "pass" as const, seat: 0 }];
    vi.spyOn(api, "createGame").mockResolvedValue({ gameId: "g1", state: makeState({ events }) });
    await useGameStore.getState().startGame(["easy", "easy"]);
    expect(useGameStore.getState().isRevealing).toBe(true);

    useGameStore.getState().reset();
    await vi.advanceTimersByTimeAsync(2000);

    expect(useGameStore.getState().state).toBeNull();
    expect(useGameStore.getState().gameId).toBeNull();
    expect(useGameStore.getState().isRevealing).toBe(false);
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
