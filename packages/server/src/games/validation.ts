import { ROOMS, SUSPECTS, WEAPONS, type CardName } from "@clue/engine";
import { z } from "zod";

const ALL_CARD_NAMES = [...SUSPECTS, ...WEAPONS, ...ROOMS] as [CardName, ...CardName[]];

export const createGameSchema = z.object({
  botDifficulties: z.tuple([z.enum(["easy", "hard"]), z.enum(["easy", "hard"])]),
  /** Use today's shared seed instead of a random one, so everyone gets the same deal. */
  daily: z.boolean().optional(),
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

/** `?since=<eventIndex>` on the state-polling route: absent means "from the start". */
export const sinceQuerySchema = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === "" ? -1 : Number(v)))
  .pipe(z.number().int().min(-1));
