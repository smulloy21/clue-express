import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createGame,
  getGameState,
  getMe,
  getRecords,
  login,
  logout,
  playAsGuest,
  signup,
  submitAccusation,
  submitDisprove,
  submitGuess,
  submitPass,
} from "./client.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends credentials and JSON body on POST requests", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: "u1", username: "alice" }));

    await signup("alice", "correct-horse-battery");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice", password: "correct-horse-battery" }),
      }),
    );
  });

  it("sends no body for GET requests", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { authenticated: false }));

    await getMe();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ method: "GET", body: null }),
    );
  });

  it("parses a successful response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { guest: true }));
    const res = await playAsGuest();
    expect(res).toEqual({ guest: true });
  });

  it("returns undefined for a 204 response", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const res = await logout();
    expect(res).toBeUndefined();
  });

  it("throws ApiError with the status and body on a non-2xx response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: "username_taken" }));

    await expect(login("alice", "password123")).rejects.toMatchObject({
      status: 409,
      message: "username_taken",
    });
  });

  it("captures the Retry-After header (in seconds) on a 429 response", async () => {
    fetchMock.mockResolvedValue(
      new Response("Too many requests, please try again later.", {
        status: 429,
        headers: { "Retry-After": "191" },
      }),
    );

    await expect(playAsGuest()).rejects.toMatchObject({ status: 429, retryAfterSeconds: 191 });
  });

  it("leaves retryAfterSeconds undefined when there's no Retry-After header", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: "internal" }));

    await expect(playAsGuest()).rejects.toMatchObject({
      status: 500,
      retryAfterSeconds: undefined,
    });
  });

  it("ApiError is an instance check-able error", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "invalid_credentials" }));
    try {
      await login("alice", "wrong");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it("builds the since query parameter for game state polling", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { redactedState: {}, events: [] }));
    await getGameState("game-1", 5);
    expect(fetchMock).toHaveBeenCalledWith("/api/games/game-1/state?since=5", expect.anything());
  });

  it("omits the since query parameter when not provided", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { redactedState: {}, events: [] }));
    await getGameState("game-1");
    expect(fetchMock).toHaveBeenCalledWith("/api/games/game-1/state", expect.anything());
  });

  it("posts the right bodies for game actions", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { state: {} }));

    await createGame(["easy", "hard"]);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/games",
      expect.objectContaining({ body: JSON.stringify({ botDifficulties: ["easy", "hard"] }) }),
    );

    const guess = { suspect: "Miss Scarlet", weapon: "Candlestick", room: "Kitchen" } as const;
    await submitGuess("game-1", guess);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/games/game-1/guess",
      expect.objectContaining({ body: JSON.stringify(guess) }),
    );

    await submitDisprove("game-1", "Knife");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/games/game-1/disprove",
      expect.objectContaining({ body: JSON.stringify({ card: "Knife" }) }),
    );

    await submitPass("game-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/games/game-1/pass",
      expect.objectContaining({ method: "POST" }),
    );

    await submitAccusation("game-1", guess);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/games/game-1/accuse",
      expect.objectContaining({ body: JSON.stringify(guess) }),
    );
  });

  it("fetches records", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { records: [] }));
    const res = await getRecords();
    expect(res).toEqual({ records: [] });
    expect(fetchMock).toHaveBeenCalledWith("/api/records", expect.anything());
  });
});
