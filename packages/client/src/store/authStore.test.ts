import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/client.js";
import { useAuthStore } from "./authStore.js";

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ auth: { status: "loading" }, error: null, isSubmitting: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("checkAuth resolves to anonymous when not authenticated", async () => {
    vi.spyOn(api, "getMe").mockResolvedValue({ authenticated: false });
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().auth).toEqual({ status: "anonymous" });
  });

  it("checkAuth resolves to guest", async () => {
    vi.spyOn(api, "getMe").mockResolvedValue({ authenticated: true, guest: true });
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().auth).toEqual({ status: "guest" });
  });

  it("checkAuth resolves to authenticated with id/username", async () => {
    vi.spyOn(api, "getMe").mockResolvedValue({
      authenticated: true,
      guest: false,
      id: "u1",
      username: "alice",
    });
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().auth).toEqual({
      status: "authenticated",
      id: "u1",
      username: "alice",
    });
  });

  it("checkAuth falls back to anonymous on network failure, with no error surfaced", async () => {
    vi.spyOn(api, "getMe").mockRejectedValue(new Error("network down"));
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().auth).toEqual({ status: "anonymous" });
    expect(useAuthStore.getState().error).toBeNull();
  });

  it("checkAuth surfaces a friendly message when rate-limited, instead of failing silently", async () => {
    vi.spyOn(api, "getMe").mockRejectedValue(new api.ApiError(429, undefined, 191));
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().auth).toEqual({ status: "anonymous" });
    expect(useAuthStore.getState().error).toBe("Too many attempts. Please try again in 4 minutes.");
  });

  it("login sets authenticated state on success", async () => {
    vi.spyOn(api, "login").mockResolvedValue({ id: "u1", username: "alice" });
    const ok = await useAuthStore.getState().login("alice", "correct-horse-battery");
    expect(ok).toBe(true);
    expect(useAuthStore.getState().auth).toEqual({
      status: "authenticated",
      id: "u1",
      username: "alice",
    });
  });

  it("login sets a friendly error message on invalid credentials", async () => {
    vi.spyOn(api, "login").mockRejectedValue(
      new api.ApiError(401, { error: "invalid_credentials" }),
    );
    const ok = await useAuthStore.getState().login("alice", "wrong");
    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe("Incorrect username or password.");
    expect(useAuthStore.getState().auth).toEqual({ status: "loading" });
  });

  it("signup sets a friendly error message when the username is taken", async () => {
    vi.spyOn(api, "signup").mockRejectedValue(new api.ApiError(409, { error: "username_taken" }));
    const ok = await useAuthStore.getState().signup("alice", "correct-horse-battery");
    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe("That username is already taken.");
  });

  it("shows how long to wait when rate-limited, using the Retry-After seconds", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new api.ApiError(429, undefined, 45));
    const ok = await useAuthStore.getState().login("alice", "wrong");
    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe(
      "Too many attempts. Please try again in 45 seconds.",
    );
  });

  it("falls back to a generic rate-limit message when Retry-After is missing", async () => {
    vi.spyOn(api, "playAsGuest").mockRejectedValue(new api.ApiError(429, undefined));
    const ok = await useAuthStore.getState().playAsGuest();
    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe("Too many attempts. Please try again later.");
  });

  it("playAsGuest sets guest state", async () => {
    vi.spyOn(api, "playAsGuest").mockResolvedValue({ guest: true });
    const ok = await useAuthStore.getState().playAsGuest();
    expect(ok).toBe(true);
    expect(useAuthStore.getState().auth).toEqual({ status: "guest" });
  });

  it("logout resets to anonymous even if the request fails", async () => {
    useAuthStore.setState({ auth: { status: "guest" } });
    vi.spyOn(api, "logout").mockRejectedValue(new Error("network down"));
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().auth).toEqual({ status: "anonymous" });
  });
});
