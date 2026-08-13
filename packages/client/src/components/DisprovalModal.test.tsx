import type { RedactedGameState } from "@clue/engine";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/client.js";
import { useGameStore } from "../store/gameStore.js";
import { DisprovalModal } from "./DisprovalModal.js";

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
    events: [],
  };
}

describe("DisprovalModal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when there is no pending disproval for the viewer", () => {
    useGameStore.setState({ gameId: "g1", state: null });
    const { container } = render(<DisprovalModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers exactly the pending options and submits the chosen card", async () => {
    const disproveSpy = vi
      .spyOn(api, "submitDisprove")
      .mockResolvedValue({ state: stateWithPending() });
    useGameStore.setState({ gameId: "g1", state: stateWithPending() });
    render(<DisprovalModal />);

    expect(screen.getByText("Miss Scarlet")).toBeInTheDocument();
    expect(screen.getByText("Knife")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Knife"));

    expect(disproveSpy).toHaveBeenCalledWith("g1", "Knife");
  });
});
