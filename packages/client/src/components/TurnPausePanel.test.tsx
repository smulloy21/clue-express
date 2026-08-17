import type { RedactedGameEvent, RedactedPlayer } from "@clue/engine";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TurnPausePanel } from "./TurnPausePanel.js";

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

describe("TurnPausePanel", () => {
  it("training mode shows direct facts, omitting the deduced section when nothing was deduced", () => {
    const turnGroups: RedactedGameEvent[][] = [
      [guess(0, 0, "Miss Scarlet", "Knife", "Kitchen"), noDisproval(1, 1)],
    ];
    render(
      <TurnPausePanel
        mode="training"
        ownSeat={0}
        ownHand={[]}
        playerCount={3}
        players={players}
        turnGroups={turnGroups}
        pendingTurnIndex={0}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText("Directly observed")).toBeInTheDocument();
    expect(screen.queryByText("Also deduced by elimination")).not.toBeInTheDocument();
    expect(screen.getByText(/doesn't have Miss Scarlet/)).toBeInTheDocument();
  });

  it("training mode shows the deduced section once elimination completes a cell", () => {
    const turnGroups: RedactedGameEvent[][] = [
      [guess(0, 0, "Colonel Mustard", "Knife", "Kitchen"), disprove(1, 0, 1, "Colonel Mustard")],
      [guess(2, 0, "Mrs. White", "Knife", "Kitchen"), disprove(3, 0, 1, "Mrs. White")],
      [guess(4, 0, "Mr. Green", "Knife", "Kitchen"), disprove(5, 0, 1, "Mr. Green")],
      [guess(6, 0, "Mrs. Peacock", "Knife", "Kitchen"), disprove(7, 0, 1, "Mrs. Peacock")],
      [guess(8, 0, "Professor Plum", "Knife", "Kitchen"), disprove(9, 0, 2, "Professor Plum")],
    ];
    render(
      <TurnPausePanel
        mode="training"
        ownSeat={0}
        ownHand={[]}
        playerCount={3}
        players={players}
        turnGroups={turnGroups}
        pendingTurnIndex={4}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText("Also deduced by elimination")).toBeInTheDocument();
    expect(screen.getByText(/Miss Scarlet must be in the envelope/)).toBeInTheDocument();
  });

  it("normal mode shows a plain note-taking prompt, with no computed explanation", () => {
    const turnGroups: RedactedGameEvent[][] = [
      [guess(0, 0, "Miss Scarlet", "Knife", "Kitchen"), noDisproval(1, 1)],
    ];
    render(
      <TurnPausePanel
        mode="normal"
        ownSeat={0}
        ownHand={[]}
        playerCount={3}
        players={players}
        turnGroups={turnGroups}
        pendingTurnIndex={0}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText("Update your notes, then continue.")).toBeInTheDocument();
    expect(screen.queryByText("Directly observed")).not.toBeInTheDocument();
  });

  it("Continue button calls the callback", async () => {
    const onContinue = vi.fn();
    const turnGroups: RedactedGameEvent[][] = [
      [guess(0, 0, "Miss Scarlet", "Knife", "Kitchen"), noDisproval(1, 1)],
    ];
    render(
      <TurnPausePanel
        mode="normal"
        ownSeat={0}
        ownHand={[]}
        playerCount={3}
        players={players}
        turnGroups={turnGroups}
        pendingTurnIndex={0}
        onContinue={onContinue}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
