import { createKnowledge, type Belief, type CardName } from "@clue/engine";
import { create } from "zustand";

export type PlayerMode = "training" | "normal";

interface NotepadStore {
  mode: PlayerMode;
  /** Manual notes, normal mode only — null in training mode (the auto-notepad needs no state). */
  manualNotes: Record<CardName, Record<string, Belief>> | null;
  /** How many turns the player has reviewed/continued past, for both modes' pacing. */
  revealedTurnCount: number;

  startNewGame: (
    ownSeat: number,
    playerCount: number,
    ownHand: readonly CardName[],
    mode: PlayerMode,
  ) => void;
  cycleCell: (card: CardName, holderKey: string) => void;
  continueTurn: (maxTurns: number) => void;
  reset: () => void;
}

const NEXT_BELIEF: Record<Belief, Belief> = { unknown: "no", no: "yes", yes: "unknown" };

export const useNotepadStore = create<NotepadStore>((set) => ({
  mode: "training",
  manualNotes: null,
  revealedTurnCount: 0,

  startNewGame(ownSeat, playerCount, ownHand, mode) {
    set({
      mode,
      revealedTurnCount: 0,
      manualNotes:
        mode === "normal" ? createKnowledge(ownSeat, playerCount, ownHand).beliefs : null,
    });
  },

  cycleCell(card, holderKey) {
    set((state) => {
      if (state.mode !== "normal" || !state.manualNotes) {
        return state;
      }
      const current = state.manualNotes[card]![holderKey]!;
      return {
        manualNotes: {
          ...state.manualNotes,
          [card]: { ...state.manualNotes[card], [holderKey]: NEXT_BELIEF[current] },
        },
      };
    });
  },

  continueTurn(maxTurns) {
    set((state) => ({ revealedTurnCount: Math.min(state.revealedTurnCount + 1, maxTurns) }));
  },

  reset() {
    set({ mode: "training", manualNotes: null, revealedTurnCount: 0 });
  },
}));
