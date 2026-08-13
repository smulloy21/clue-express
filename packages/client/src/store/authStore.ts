import { create } from "zustand";
import * as api from "../api/client.js";

export type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "guest" }
  | { status: "authenticated"; id: string; username: string };

interface AuthStore {
  auth: AuthState;
  error: string | null;
  isSubmitting: boolean;
  checkAuth: () => Promise<void>;
  signup: (username: string, password: string) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  playAsGuest: () => Promise<boolean>;
  logout: () => Promise<void>;
}

function toAuthState(me: api.MeResponse): AuthState {
  if (!me.authenticated) {
    return { status: "anonymous" };
  }
  if (me.guest) {
    return { status: "guest" };
  }
  return { status: "authenticated", id: me.id!, username: me.username! };
}

function describeError(err: unknown): string {
  if (err instanceof api.ApiError) {
    switch (err.message) {
      case "username_taken":
        return "That username is already taken.";
      case "invalid_credentials":
        return "Incorrect username or password.";
      case "validation":
        return "Username must be 3-32 characters and password at least 8 characters.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

export const useAuthStore = create<AuthStore>((set) => ({
  auth: { status: "loading" },
  error: null,
  isSubmitting: false,

  async checkAuth() {
    try {
      const me = await api.getMe();
      set({ auth: toAuthState(me) });
    } catch {
      set({ auth: { status: "anonymous" } });
    }
  },

  async signup(username, password) {
    set({ isSubmitting: true, error: null });
    try {
      const user = await api.signup(username, password);
      set({
        auth: { status: "authenticated", id: user.id, username: user.username },
        isSubmitting: false,
      });
      return true;
    } catch (err) {
      set({ error: describeError(err), isSubmitting: false });
      return false;
    }
  },

  async login(username, password) {
    set({ isSubmitting: true, error: null });
    try {
      const user = await api.login(username, password);
      set({
        auth: { status: "authenticated", id: user.id, username: user.username },
        isSubmitting: false,
      });
      return true;
    } catch (err) {
      set({ error: describeError(err), isSubmitting: false });
      return false;
    }
  },

  async playAsGuest() {
    set({ isSubmitting: true, error: null });
    try {
      await api.playAsGuest();
      set({ auth: { status: "guest" }, isSubmitting: false });
      return true;
    } catch (err) {
      set({ error: describeError(err), isSubmitting: false });
      return false;
    }
  },

  async logout() {
    try {
      await api.logout();
    } catch {
      // Best-effort: even if the request fails, forget the session locally.
    } finally {
      set({ auth: { status: "anonymous" }, error: null });
    }
  },
}));
