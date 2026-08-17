import type { RedactedGameEvent, RedactedPlayer } from "@clue/engine";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventLog } from "./EventLog.js";

const players: RedactedPlayer[] = [
  { seat: 0, type: "human", eliminated: false, handSize: 6, hand: ["Miss Scarlet"] },
  { seat: 1, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
  { seat: 2, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
];

const events: RedactedGameEvent[] = [
  { index: 0, type: "pass", seat: 0 },
  { index: 1, type: "no_disproval", seat: 1 },
  { index: 2, type: "no_disproval", seat: 2 },
];

describe("EventLog", () => {
  it("shows events in chronological order, oldest first, matching the pause panel's reading direction", () => {
    render(<EventLog events={events} players={players} viewerSeat={0} />);

    const entries = screen.getAllByText(/passed\.|could not disprove\./);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveTextContent("You passed.");
    expect(entries[1]).toHaveTextContent("Bot 1 (easy) could not disprove.");
    expect(entries[2]).toHaveTextContent("Bot 2 (easy) could not disprove.");
  });

  it("keeps showing older events as new ones arrive, newest still at the bottom", () => {
    const { rerender } = render(<EventLog events={events} players={players} viewerSeat={0} />);

    const nextEvents: RedactedGameEvent[] = [
      ...events,
      {
        index: 3,
        type: "guess",
        seat: 0,
        guess: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
      },
    ];
    rerender(<EventLog events={nextEvents} players={players} viewerSeat={0} />);

    const entries = screen.getAllByText(/passed\.|could not disprove\.|guessed/);
    expect(entries).toHaveLength(4);
    expect(entries[0]).toHaveTextContent("You passed.");
    expect(entries[3]).toHaveTextContent("guessed");
  });

  it("auto-scrolls to the bottom when new events arrive", () => {
    const { container, rerender } = render(
      <EventLog events={events} players={players} viewerSeat={0} />,
    );

    const logEl = container.querySelector(".event-log") as HTMLElement;
    Object.defineProperty(logEl, "scrollHeight", { value: 500, configurable: true });
    logEl.scrollTop = 0;

    const nextEvents: RedactedGameEvent[] = [...events, { index: 3, type: "pass", seat: 1 }];
    rerender(<EventLog events={nextEvents} players={players} viewerSeat={0} />);

    expect(logEl.scrollTop).toBe(500);
  });

  it("marks a turn boundary before each guess, except when it's the very first event", () => {
    const guess = (index: number, seat: number): RedactedGameEvent => ({
      index,
      seat,
      type: "guess",
      guess: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
    });
    const multiTurnEvents: RedactedGameEvent[] = [
      guess(0, 0),
      { index: 1, type: "no_disproval", seat: 1 },
      guess(2, 1),
      { index: 3, type: "pass", seat: 2 },
    ];
    const { container } = render(
      <EventLog events={multiTurnEvents} players={players} viewerSeat={0} />,
    );

    const entries = container.querySelectorAll(".event-entry");
    expect(entries[0]).not.toHaveClass("turn-boundary");
    expect(entries[1]).not.toHaveClass("turn-boundary");
    expect(entries[2]).toHaveClass("turn-boundary");
    expect(entries[3]).not.toHaveClass("turn-boundary");
  });
});
