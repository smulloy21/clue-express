import type { RedactedGameEvent, RedactedPlayer } from "@clue/engine";
import { describe, expect, it } from "vitest";
import { computeKnowledge } from "./notepad.js";
import { diffBeliefs, directTargetsForTurn, explainTurn } from "./trainingExplanation.js";

const guess = (
  index: number,
  seat: number,
  suspect: string,
  weapon: string,
  room: string,
): RedactedGameEvent => ({
  index,
  type: "guess",
  seat,
  guess: { suspect: suspect as never, weapon: weapon as never, room: room as never },
});
const noDisproval = (index: number, seat: number): RedactedGameEvent => ({
  index,
  type: "no_disproval",
  seat,
});
const disprove = (
  index: number,
  guesserSeat: number,
  disproverSeat: number,
  card: string,
): RedactedGameEvent => ({
  index,
  type: "disprove",
  guesserSeat,
  disproverSeat,
  card: card as never,
});

const players: RedactedPlayer[] = [
  { seat: 0, type: "human", eliminated: false, handSize: 6, hand: [] },
  { seat: 1, type: "bot", difficulty: "hard", eliminated: false, handSize: 6 },
  { seat: 2, type: "bot", difficulty: "hard", eliminated: false, handSize: 6 },
];

describe("directTargetsForTurn", () => {
  it("tags all three guessed cards as could_not_disprove for a no_disproval seat", () => {
    const turn = [guess(0, 0, "Miss Scarlet", "Knife", "Kitchen"), noDisproval(1, 1)];
    const targets = directTargetsForTurn(turn);
    expect(targets.get("Miss Scarlet|1")).toBe("could_not_disprove");
    expect(targets.get("Knife|1")).toBe("could_not_disprove");
    expect(targets.get("Kitchen|1")).toBe("could_not_disprove");
  });

  it("tags only the shown card as shown_to_you for a visible disprove", () => {
    const turn = [guess(0, 0, "Miss Scarlet", "Knife", "Kitchen"), disprove(1, 0, 1, "Knife")];
    const targets = directTargetsForTurn(turn);
    expect(targets.get("Knife|1")).toBe("shown_to_you");
    expect(targets.size).toBe(1);
  });

  it("tags nothing for a hidden disprove (card undefined)", () => {
    const turn: RedactedGameEvent[] = [
      guess(0, 0, "Miss Scarlet", "Knife", "Kitchen"),
      { index: 1, type: "disprove", guesserSeat: 0, disproverSeat: 1 } as RedactedGameEvent,
    ];
    expect(directTargetsForTurn(turn).size).toBe(0);
  });
});

describe("diffBeliefs", () => {
  it("finds exactly the cells that changed between two knowledge snapshots", () => {
    const before = computeKnowledge(0, [], 3, []);
    const after = computeKnowledge(0, [], 3, [
      guess(0, 0, "Miss Scarlet", "Knife", "Kitchen"),
      disprove(1, 0, 1, "Knife"),
    ]);
    const changes = diffBeliefs(before, after, 3);
    const knifeSeat1 = changes.find((c) => c.card === "Knife" && c.holderKey === "1");
    expect(knifeSeat1?.belief).toBe("yes");
    // Nothing about "Miss Scarlet" or "Kitchen" should have changed from a mere guess event.
    expect(changes.some((c) => c.card === "Miss Scarlet")).toBe(false);
  });
});

describe("explainTurn", () => {
  it("classifies a directly shown card as direct, and its knock-on envelope resolution as deduced", () => {
    // Confirm 4 of the 5 non-target suspects to player hands across turns 0-3, then confirm the
    // 5th during the tested turn (4) — completing the "envelope holds one suspect" elimination
    // for "Miss Scarlet", the one suspect never directly asserted anywhere.
    const turnGroups: RedactedGameEvent[][] = [
      [guess(0, 0, "Colonel Mustard", "Knife", "Kitchen"), disprove(1, 0, 1, "Colonel Mustard")],
      [guess(2, 0, "Mrs. White", "Knife", "Kitchen"), disprove(3, 0, 1, "Mrs. White")],
      [guess(4, 0, "Mr. Green", "Knife", "Kitchen"), disprove(5, 0, 1, "Mr. Green")],
      [guess(6, 0, "Mrs. Peacock", "Knife", "Kitchen"), disprove(7, 0, 1, "Mrs. Peacock")],
      [guess(8, 0, "Professor Plum", "Knife", "Kitchen"), disprove(9, 0, 2, "Professor Plum")],
    ];

    const result = explainTurn(0, [], 3, players, turnGroups, 4);

    expect(result.direct.some((line) => line.includes("showed you Professor Plum"))).toBe(true);
    expect(
      result.deduced.some((line) => line.includes("Miss Scarlet must be in the envelope")),
    ).toBe(true);
    // The directly-shown fact must not also appear in the deduced list.
    expect(
      result.deduced.some((line) => line.includes("Professor Plum") && line.includes("showed")),
    ).toBe(false);
  });

  it("omits the deduced group when only direct facts change", () => {
    const turnGroups: RedactedGameEvent[][] = [
      [guess(0, 0, "Miss Scarlet", "Knife", "Kitchen"), noDisproval(1, 1)],
    ];
    const result = explainTurn(0, [], 3, players, turnGroups, 0);
    expect(result.direct.length).toBeGreaterThan(0);
    expect(result.deduced).toEqual([]);
  });
});
