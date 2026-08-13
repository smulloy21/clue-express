import type { Accusation, BotDifficulty, CardName, Guess, RedactedGameState } from "@clue/engine";
import { create } from "zustand";
import * as api from "../api/client.js";
import { useAuthStore } from "./authStore.js";

const EVENT_REVEAL_DELAY_MS = 500;

interface GameStore {
  gameId: string | null;
  state: RedactedGameState | null;
  /** How many of `state.events` have been "revealed" so far, for paced playback. */
  visibleEventCount: number;
  isRevealing: boolean;
  isSubmitting: boolean;
  actionError: string | null;
  /** Bumped on every new state so an in-flight reveal loop from a stale state can stop itself. */
  revealToken: number;

  startGame: (botDifficulties: [BotDifficulty, BotDifficulty], daily?: boolean) => Promise<boolean>;
  guess: (guess: Guess) => Promise<void>;
  disprove: (card: CardName) => Promise<void>;
  pass: () => Promise<void>;
  accuse: (accusation: Accusation) => Promise<void>;
  reset: () => void;
}

function describeActionError(err: unknown): string {
  if (err instanceof api.ApiError) {
    switch (err.message) {
      case "unauthenticated":
        return "Your session has expired. Please log in again.";
      case "game_not_found":
        return "This game is no longer available.";
      case "illegal_action":
        return "That move isn't allowed right now.";
      case "game_not_active":
        return "This game has already ended.";
      case "validation":
        return "That doesn't look like a valid move.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

/** Errors after which continuing to show the current game would just be confusing. */
function isStaleGameError(err: unknown): boolean {
  return (
    err instanceof api.ApiError &&
    (err.message === "unauthenticated" || err.message === "game_not_found")
  );
}

export const useGameStore = create<GameStore>((set, get) => {
  function applyNewState(gameId: string, state: RedactedGameState): void {
    const token = get().revealToken + 1;
    set({
      gameId,
      state,
      visibleEventCount: 0,
      isRevealing: state.events.length > 0,
      revealToken: token,
    });
    revealNext(token);
  }

  function revealNext(token: number): void {
    const { state, visibleEventCount } = get();
    if (!state || token !== get().revealToken) {
      return;
    }
    if (visibleEventCount >= state.events.length) {
      set({ isRevealing: false });
      return;
    }
    setTimeout(() => {
      if (token !== get().revealToken) {
        return;
      }
      set((s) => ({ visibleEventCount: s.visibleEventCount + 1 }));
      revealNext(token);
    }, EVENT_REVEAL_DELAY_MS);
  }

  function handleFailure(err: unknown): void {
    const message = describeActionError(err);
    if (err instanceof api.ApiError && err.message === "unauthenticated") {
      useAuthStore.setState({ auth: { status: "anonymous" }, error: null });
    }
    if (isStaleGameError(err)) {
      set({
        gameId: null,
        state: null,
        visibleEventCount: 0,
        isRevealing: false,
        isSubmitting: false,
        actionError: message,
        revealToken: get().revealToken + 1,
      });
    } else {
      set({ isSubmitting: false, actionError: message });
    }
  }

  async function runAction(action: () => Promise<api.ActionResponse>): Promise<void> {
    const { gameId } = get();
    if (!gameId) {
      return;
    }
    set({ isSubmitting: true, actionError: null });
    try {
      const res = await action();
      set({ isSubmitting: false });
      applyNewState(gameId, res.state);
    } catch (err) {
      handleFailure(err);
    }
  }

  return {
    gameId: null,
    state: null,
    visibleEventCount: 0,
    isRevealing: false,
    isSubmitting: false,
    actionError: null,
    revealToken: 0,

    async startGame(botDifficulties, daily) {
      set({ isSubmitting: true, actionError: null });
      try {
        const res = await api.createGame(botDifficulties, daily);
        set({ isSubmitting: false });
        applyNewState(res.gameId, res.state);
        return true;
      } catch (err) {
        handleFailure(err);
        return false;
      }
    },

    guess(guess) {
      return runAction(() => api.submitGuess(get().gameId!, guess));
    },

    disprove(card) {
      return runAction(() => api.submitDisprove(get().gameId!, card));
    },

    pass() {
      return runAction(() => api.submitPass(get().gameId!));
    },

    accuse(accusation) {
      return runAction(() => api.submitAccusation(get().gameId!, accusation));
    },

    reset() {
      set({
        gameId: null,
        state: null,
        visibleEventCount: 0,
        isRevealing: false,
        isSubmitting: false,
        actionError: null,
        revealToken: get().revealToken + 1,
      });
    },
  };
});
