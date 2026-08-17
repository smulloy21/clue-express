import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HowToPlayModal } from "./HowToPlayModal.js";

describe("HowToPlayModal", () => {
  it("explains the opponents, mode choice, and turn flow", () => {
    render(<HowToPlayModal onClose={vi.fn()} />);

    expect(screen.getByText("How to play")).toBeInTheDocument();
    expect(screen.getByText("Mode")).toBeInTheDocument();
    expect(screen.getByText("Normal", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Training", { selector: "strong" })).toBeInTheDocument();
  });

  it("calls onClose when dismissed", async () => {
    const onClose = vi.fn();
    render(<HowToPlayModal onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
