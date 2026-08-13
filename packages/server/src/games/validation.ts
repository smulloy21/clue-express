import { ROOMS, SUSPECTS, WEAPONS, type CardName } from "@clue/engine";
import { z } from "zod";

const ALL_CARD_NAMES = [...SUSPECTS, ...WEAPONS, ...ROOMS] as [CardName, ...CardName[]];

export const createGameSchema = z.object({
  botDifficulties: z.tuple([z.enum(["easy", "hard"]), z.enum(["easy", "hard"])]),
});

export const guessSchema = z.object({
  suspect: z.enum(SUSPECTS),
  weapon: z.enum(WEAPONS),
  room: z.enum(ROOMS),
});

export const accusationSchema = guessSchema;

export const disproveSchema = z.object({
  card: z.enum(ALL_CARD_NAMES),
});
