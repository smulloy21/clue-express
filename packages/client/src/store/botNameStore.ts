import { create } from "zustand";
import { pickNicknames } from "../game/botNames.js";

interface BotNameStore {
  /** Seat -> nickname, for this game's bot seats only. */
  nicknames: Record<number, string>;
  assignNicknames: (botSeats: readonly number[]) => void;
  reset: () => void;
}

export const useBotNameStore = create<BotNameStore>((set) => ({
  nicknames: {},

  assignNicknames(botSeats) {
    const picked = pickNicknames(botSeats.length);
    const nicknames: Record<number, string> = {};
    botSeats.forEach((seat, i) => {
      nicknames[seat] = picked[i]!;
    });
    set({ nicknames });
  },

  reset() {
    set({ nicknames: {} });
  },
}));
