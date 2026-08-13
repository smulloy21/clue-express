import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/client.js";
import { useAuthStore } from "../store/authStore.js";
import { useGameStore } from "../store/gameStore.js";
import { NewGameScreen } from "./NewGameScreen.js";

describe("NewGameScreen", () => {
  beforeEach(() => {
    useAuthStore.setState({ auth: { status: "guest" }, error: null, isSubmitting: false });
    useGameStore.setState({
      gameId: null,
      state: null,
      visibleEventCount: 0,
      isRevealing: false,
      isSubmitting: false,
      actionError: null,
      revealToken: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts a game with the chosen difficulties and daily flag unset by default", async () => {
    const createSpy = vi
      .spyOn(api, "createGame")
      .mockResolvedValue({ gameId: "g1", state: { events: [] } as never });
    render(<NewGameScreen onViewRecords={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(createSpy).toHaveBeenCalledWith(["easy", "hard"], false);
  });

  it("passes daily: true when the checkbox is checked", async () => {
    const createSpy = vi
      .spyOn(api, "createGame")
      .mockResolvedValue({ gameId: "g1", state: { events: [] } as never });
    render(<NewGameScreen onViewRecords={vi.fn()} />);

    await userEvent.click(screen.getByLabelText(/daily challenge/i));
    await userEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(createSpy).toHaveBeenCalledWith(["easy", "hard"], true);
  });
});
