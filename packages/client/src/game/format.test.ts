import type { RedactedGameEvent, RedactedPlayer } from "@clue/engine";
import { describe, expect, it } from "vitest";
import { describeEvent, orderPlayersForColumns, playerLabel, withNicknames } from "./format.js";

const players: RedactedPlayer[] = [
  { seat: 0, type: "human", eliminated: false, handSize: 6, hand: ["Miss Scarlet"] },
  { seat: 1, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
];

describe("describeEvent", () => {
  it("omits 'the' before a shown suspect card", () => {
    const event: RedactedGameEvent = {
      index: 0,
      type: "disprove",
      guesserSeat: 0,
      disproverSeat: 1,
      card: "Miss Scarlet",
    };
    expect(describeEvent(event, players, 0)).toBe("Bot 1 (easy) showed You Miss Scarlet.");
  });

  it("includes 'the' before a shown weapon card", () => {
    const event: RedactedGameEvent = {
      index: 0,
      type: "disprove",
      guesserSeat: 0,
      disproverSeat: 1,
      card: "Candlestick",
    };
    expect(describeEvent(event, players, 0)).toBe("Bot 1 (easy) showed You the Candlestick.");
  });

  it("includes 'the' before a shown room card", () => {
    const event: RedactedGameEvent = {
      index: 0,
      type: "disprove",
      guesserSeat: 0,
      disproverSeat: 1,
      card: "Kitchen",
    };
    expect(describeEvent(event, players, 0)).toBe("Bot 1 (easy) showed You the Kitchen.");
  });

  it("falls back to the generic phrasing when the card is hidden from this viewer", () => {
    const event: RedactedGameEvent = {
      index: 0,
      type: "disprove",
      guesserSeat: 0,
      disproverSeat: 1,
    };
    expect(describeEvent(event, players, 0)).toBe("Bot 1 (easy) disproved You's guess.");
  });
});

describe("orderPlayersForColumns", () => {
  const threeSeats: RedactedPlayer[] = [
    { seat: 0, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
    { seat: 1, type: "human", eliminated: false, handSize: 6, hand: [] },
    { seat: 2, type: "bot", difficulty: "hard", eliminated: false, handSize: 6 },
  ];

  it("wraps around so the column order matches turn order, not seat number order", () => {
    // Turns go 0 -> 1 -> 2 -> 0 -> ...; from seat 1's perspective, next up is seat 2, then
    // wrapping back around to seat 0 — so the columns should read You, seat 2, seat 0.
    const ordered = orderPlayersForColumns(threeSeats, 1);
    expect(ordered.map((p) => p.seat)).toEqual([1, 2, 0]);
  });

  it("degrades to plain ascending order when the viewer is seat 0", () => {
    const ordered = orderPlayersForColumns(threeSeats, 0);
    expect(ordered.map((p) => p.seat)).toEqual([0, 1, 2]);
  });

  it("still wraps correctly when the viewer is the last seat", () => {
    const ordered = orderPlayersForColumns(threeSeats, 2);
    expect(ordered.map((p) => p.seat)).toEqual([2, 0, 1]);
  });
});

describe("playerLabel", () => {
  const bot: RedactedPlayer = {
    seat: 1,
    type: "bot",
    difficulty: "hard",
    eliminated: false,
    handSize: 6,
  };

  it("uses the assigned nickname when the player is decorated with one", () => {
    expect(playerLabel({ ...bot, nickname: "Rex" }, 0)).toBe("Rex (hard)");
  });

  it("falls back to 'Bot {seat}' when no nickname is assigned", () => {
    expect(playerLabel(bot, 0)).toBe("Bot 1 (hard)");
  });

  it("still shows 'You' for the viewer's own seat, even if a nickname is attached", () => {
    expect(playerLabel({ ...bot, seat: 0, nickname: "Rex" }, 0)).toBe("You");
  });
});

describe("withNicknames", () => {
  const threeSeats: RedactedPlayer[] = [
    { seat: 0, type: "human", eliminated: false, handSize: 6, hand: [] },
    { seat: 1, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
    { seat: 2, type: "bot", difficulty: "hard", eliminated: false, handSize: 6 },
  ];

  it("attaches a nickname only to seats present in the map", () => {
    const decorated = withNicknames(threeSeats, { 1: "Rex", 2: "Nova" });
    expect(decorated.find((p) => p.seat === 0)?.nickname).toBeUndefined();
    expect(decorated.find((p) => p.seat === 1)?.nickname).toBe("Rex");
    expect(decorated.find((p) => p.seat === 2)?.nickname).toBe("Nova");
  });

  it("leaves players unchanged when no nicknames are assigned", () => {
    const decorated = withNicknames(threeSeats, {});
    expect(decorated).toEqual(threeSeats);
  });
});
