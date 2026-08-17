import {
  ROOMS,
  SUSPECTS,
  WEAPONS,
  type RedactedGameEvent,
  type RedactedPlayer,
} from "@clue/engine";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetectiveNotepad } from "./DetectiveNotepad.js";

const [S0] = SUSPECTS;
const [W0] = WEAPONS;
const [R0] = ROOMS;

const players: RedactedPlayer[] = [
  { seat: 0, type: "human", eliminated: false, handSize: 6, hand: [S0!] },
  { seat: 1, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
  { seat: 2, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
];

const playersWithHumanLastInSeatOrder: RedactedPlayer[] = [
  { seat: 0, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
  { seat: 1, type: "bot", difficulty: "hard", eliminated: false, handSize: 6 },
  { seat: 2, type: "human", eliminated: false, handSize: 6, hand: [S0!] },
];

const playersWithHumanInMiddleSeat: RedactedPlayer[] = [
  { seat: 0, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
  { seat: 1, type: "human", eliminated: false, handSize: 6, hand: [S0!] },
  { seat: 2, type: "bot", difficulty: "hard", eliminated: false, handSize: 6 },
];

describe("DetectiveNotepad", () => {
  it("always shows the 'You' column first, even when the human isn't seat 0", () => {
    render(
      <DetectiveNotepad
        ownSeat={2}
        ownHand={[S0!]}
        players={playersWithHumanLastInSeatOrder}
        events={[]}
      />,
    );

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Card", "You", "Bot 0 (easy)", "Bot 1 (hard)", "Envelope"]);
  });

  it("orders columns by turn order (wrapping around), not by ascending seat number", () => {
    render(
      <DetectiveNotepad
        ownSeat={1}
        ownHand={[S0!]}
        players={playersWithHumanInMiddleSeat}
        events={[]}
      />,
    );

    // Turns go seat 0 -> 1 -> 2 -> 0 -> ...; from seat 1, next up is seat 2, then seat 0.
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Card", "You", "Bot 2 (hard)", "Bot 0 (easy)", "Envelope"]);
  });

  it("attributes each belief cell to the right player after reordering columns", () => {
    const events: RedactedGameEvent[] = [
      { index: 0, type: "guess", seat: 2, guess: { suspect: S0!, weapon: W0!, room: R0! } },
      { index: 1, type: "disprove", guesserSeat: 2, disproverSeat: 1, card: W0! },
    ];
    render(
      <DetectiveNotepad
        ownSeat={2}
        ownHand={[S0!]}
        players={playersWithHumanLastInSeatOrder}
        events={events}
      />,
    );

    // W0 was shown by seat 1 ("Bot 0 (easy)" here, seat 0 is the other bot) — belief lives
    // under the correct column regardless of display order.
    const row = screen.getByRole("cell", { name: W0! }).closest("tr")!;
    const cells = Array.from(row.querySelectorAll("td"));
    // [card-name, You, Bot 0 (easy) i.e. seat 0, Bot 1 (hard) i.e. seat 1, Envelope]
    expect(cells[3]).toHaveClass("belief-yes");
    expect(cells[2]).toHaveClass("belief-no");
  });

  it("marks a thicker boundary between card categories, but not within one", () => {
    render(<DetectiveNotepad ownSeat={0} ownHand={[S0!]} players={players} events={[]} />);

    expect(screen.getByRole("cell", { name: "Candlestick" }).closest("tr")).toHaveClass(
      "category-boundary",
    );
    expect(screen.getByRole("cell", { name: "Colonel Mustard" }).closest("tr")).not.toHaveClass(
      "category-boundary",
    );
    expect(screen.getByRole("cell", { name: "Kitchen" }).closest("tr")).toHaveClass(
      "category-boundary",
    );
  });
});
