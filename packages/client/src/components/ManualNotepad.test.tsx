import type { RedactedPlayer } from "@clue/engine";
import { SUSPECTS } from "@clue/engine";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useNotepadStore } from "../store/notepadStore.js";
import { ManualNotepad } from "./ManualNotepad.js";

const [S0, S1] = SUSPECTS;

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

describe("ManualNotepad", () => {
  beforeEach(() => {
    useNotepadStore.getState().reset();
  });

  it("renders nothing when there are no manual notes yet", () => {
    const { container } = render(<ManualNotepad ownSeat={0} players={players} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the seeded prefill from the dealt hand", () => {
    useNotepadStore.getState().startNewGame(0, 3, [S0!], "normal");
    render(<ManualNotepad ownSeat={0} players={players} />);

    expect(screen.getByLabelText(`${S0} — You`)).toHaveTextContent("✓");
    expect(screen.getByLabelText(`${S1} — You`)).toHaveTextContent("·");
  });

  it("clicking a cell cycles its belief, unknown -> no -> yes -> unknown", async () => {
    useNotepadStore.getState().startNewGame(0, 3, [S0!], "normal");
    render(<ManualNotepad ownSeat={0} players={players} />);

    const cell = screen.getByLabelText(`${S1} — Bot 1 (easy)`);
    expect(cell).toHaveTextContent("·");
    await userEvent.click(cell);
    expect(cell).toHaveTextContent("✕");
    await userEvent.click(cell);
    expect(cell).toHaveTextContent("✓");
    await userEvent.click(cell);
    expect(cell).toHaveTextContent("·");
  });

  it("always shows the 'You' column first, even when the human isn't seat 0", () => {
    useNotepadStore.getState().startNewGame(2, 3, [S0!], "normal");
    render(<ManualNotepad ownSeat={2} players={playersWithHumanLastInSeatOrder} />);

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Card", "You", "Bot 0 (easy)", "Bot 1 (hard)", "Envelope"]);
  });

  it("orders columns by turn order (wrapping around), not by ascending seat number", () => {
    useNotepadStore.getState().startNewGame(1, 3, [S0!], "normal");
    render(<ManualNotepad ownSeat={1} players={playersWithHumanInMiddleSeat} />);

    // Turns go seat 0 -> 1 -> 2 -> 0 -> ...; from seat 1, next up is seat 2, then seat 0.
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Card", "You", "Bot 2 (hard)", "Bot 0 (easy)", "Envelope"]);
  });

  it("marks a thicker boundary between card categories, but not within one", () => {
    useNotepadStore.getState().startNewGame(0, 3, [S0!], "normal");
    render(<ManualNotepad ownSeat={0} players={players} />);

    // Suspects -> weapons boundary.
    expect(screen.getByRole("cell", { name: "Candlestick" }).closest("tr")).toHaveClass(
      "category-boundary",
    );
    // Within suspects, no boundary.
    expect(screen.getByRole("cell", { name: "Colonel Mustard" }).closest("tr")).not.toHaveClass(
      "category-boundary",
    );
    // Weapons -> rooms boundary.
    expect(screen.getByRole("cell", { name: "Kitchen" }).closest("tr")).toHaveClass(
      "category-boundary",
    );
  });
});
