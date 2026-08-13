import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/client.js";
import { useGameStore } from "../store/gameStore.js";
import { AccuseDialog } from "./AccuseDialog.js";

describe("AccuseDialog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useGameStore.setState({ gameId: "g1", isSubmitting: false });
  });

  it("requires a second confirmation step before submitting an accusation", async () => {
    const accuseSpy = vi.spyOn(api, "submitAccusation");
    useGameStore.setState({ gameId: "g1" });
    render(<AccuseDialog onClose={vi.fn()} />);

    // First click only reveals the confirmation — no request sent yet.
    await userEvent.click(screen.getByRole("button", { name: "Accuse…" }));
    expect(accuseSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/this is final/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Yes, accuse" }));
    expect(accuseSpy).toHaveBeenCalledWith(
      "g1",
      expect.objectContaining({ suspect: expect.any(String) }),
    );
  });

  it("lets the player back out of the confirmation without accusing", async () => {
    const accuseSpy = vi.spyOn(api, "submitAccusation");
    render(<AccuseDialog onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Accuse…" }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("button", { name: "Accuse…" })).toBeInTheDocument();
    expect(accuseSpy).not.toHaveBeenCalled();
  });

  it("cancel closes the dialog without accusing", async () => {
    const onClose = vi.fn();
    const accuseSpy = vi.spyOn(api, "submitAccusation");
    render(<AccuseDialog onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(accuseSpy).not.toHaveBeenCalled();
  });
});
