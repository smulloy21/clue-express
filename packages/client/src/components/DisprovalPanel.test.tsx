import type { RedactedGameState } from "@clue/engine";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/client.js";
import { useGameStore } from "../store/gameStore.js";
import { DisprovalPanel } from "./DisprovalPanel.js";

function stateWithPending(): RedactedGameState {
  return {
    viewerSeat: 1,
    status: "in_progress",
    players: [
      { seat: 0, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
      { seat: 1, type: "human", eliminated: false, handSize: 6, hand: ["Miss Scarlet", "Knife"] },
      { seat: 2, type: "bot", difficulty: "easy", eliminated: false, handSize: 6 },
    ],
    turn: {
      currentSeat: 0,
      phase: "awaiting_disproval",
      pending: { guesserSeat: 0, disproverSeat: 1, options: ["Miss Scarlet", "Knife"] },
    },
    winnerSeat: null,
    events: [
      {
        index: 0,
        type: "guess",
        seat: 0,
        guess: { suspect: "Miss Scarlet", weapon: "Knife", room: "Kitchen" },
      },
    ],
  };
}

describe("DisprovalPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when there is no pending disproval for the viewer", () => {
    useGameStore.setState({ gameId: "g1", state: null });
    const { container } = render(<DisprovalPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders inline, not as a blocking overlay, so surrounding content stays visible", () => {
    useGameStore.setState({ gameId: "g1", state: stateWithPending() });
    const { container } = render(<DisprovalPanel />);
    expect(container.querySelector(".modal-overlay")).not.toBeInTheDocument();
    expect(container.querySelector(".disproval-panel")).toBeInTheDocument();
  });

  it("shows the full guess being disproved, for context", () => {
    useGameStore.setState({ gameId: "g1", state: stateWithPending() });
    render(<DisprovalPanel />);

    expect(
      screen.getByText("Bot 0 (easy) guessed Miss Scarlet, Knife, in the Kitchen."),
    ).toBeInTheDocument();
  });

  it("offers exactly the pending options and submits the chosen card", async () => {
    const disproveSpy = vi
      .spyOn(api, "submitDisprove")
      .mockResolvedValue({ state: stateWithPending() });
    useGameStore.setState({ gameId: "g1", state: stateWithPending() });
    render(<DisprovalPanel />);

    expect(screen.getByText("Miss Scarlet")).toBeInTheDocument();
    expect(screen.getByText("Knife")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Knife"));

    expect(disproveSpy).toHaveBeenCalledWith("g1", "Knife");
  });
});
