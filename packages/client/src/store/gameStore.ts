import type { Accusation, BotDifficulty, CardName, Guess, RedactedGameState } from "@clue/engine";
import { create } from "zustand";
import * as api from "../api/client.js";
import { useAuthStore } from "./authStore.js";

interface GameStore {
  gameId: string | null;
  state: RedactedGameState | null;
  isSubmitting: boolean;
  actionError: string | null;

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
  function handleFailure(err: unknown): void {
    const message = describeActionError(err);
    if (err instanceof api.ApiError && err.message === "unauthenticated") {
      useAuthStore.setState({ auth: { status: "anonymous" }, error: null });
    }
    if (isStaleGameError(err)) {
      set({ gameId: null, state: null, isSubmitting: false, actionError: message });
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
      set({ isSubmitting: false, state: res.state });
    } catch (err) {
      handleFailure(err);
    }
  }

  return {
    gameId: null,
    state: null,
    isSubmitting: false,
    actionError: null,

    async startGame(botDifficulties, daily) {
      set({ isSubmitting: true, actionError: null });
      try {
        const res = await api.createGame(botDifficulties, daily);
        set({ isSubmitting: false, gameId: res.gameId, state: res.state });
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
      set({ gameId: null, state: null, isSubmitting: false, actionError: null });
    },
  };
});
