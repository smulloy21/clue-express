import { ROOMS, SUSPECTS, WEAPONS, type RedactedGameEvent } from "@clue/engine";
import { describe, expect, it } from "vitest";
import { computeNotepadRows } from "./notepad.js";

const [S0, S1, S2] = SUSPECTS;
const [W0, W1] = WEAPONS;
const [R0] = ROOMS;

function findRow(rows: ReturnType<typeof computeNotepadRows>, card: string) {
  const row = rows.find((r) => r.card === card);
  if (!row) throw new Error(`no row for ${card}`);
  return row;
}

describe("computeNotepadRows", () => {
  it("marks the viewer's own hand as yes for their own seat", () => {
    const rows = computeNotepadRows(0, [S0!, W0!], 3, []);
    expect(findRow(rows, S0!).cells[0]).toBe("yes");
    expect(findRow(rows, W0!).cells[0]).toBe("yes");
  });

  it("leaves untouched cards unknown", () => {
    const rows = computeNotepadRows(0, [S0!], 3, []);
    expect(findRow(rows, S1!).cells).toEqual(["unknown", "unknown", "unknown", "unknown"]);
  });

  it("records a card shown to the viewer as the guesser", () => {
    const events: RedactedGameEvent[] = [
      { index: 0, type: "guess", seat: 0, guess: { suspect: S2!, weapon: W0!, room: R0! } },
      { index: 1, type: "disprove", guesserSeat: 0, disproverSeat: 1, card: W0! },
    ];
    const rows = computeNotepadRows(0, [S0!], 3, events);
    // cells order: [seat0, seat1, seat2, envelope]
    expect(findRow(rows, W0!).cells[1]).toBe("yes");
  });

  it("applies hard-level inference: a no_disproval rules out all three guessed cards", () => {
    const events: RedactedGameEvent[] = [
      { index: 0, type: "guess", seat: 0, guess: { suspect: S1!, weapon: W1!, room: R0! } },
      { index: 1, type: "no_disproval", seat: 2 },
    ];
    const rows = computeNotepadRows(0, [S0!], 3, events);
    expect(findRow(rows, S1!).cells[2]).toBe("no");
    expect(findRow(rows, W1!).cells[2]).toBe("no");
    expect(findRow(rows, R0!).cells[2]).toBe("no");
  });

  it("never marks anything yes for another player's hand without evidence", () => {
    const rows = computeNotepadRows(0, [S0!], 3, []);
    for (const row of rows) {
      if (row.card === S0!) continue;
      expect(row.cells[1]).not.toBe("yes");
      expect(row.cells[2]).not.toBe("yes");
    }
  });
});
