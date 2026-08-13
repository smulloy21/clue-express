import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/client.js";
import { useAuthStore } from "../store/authStore.js";
import { LandingScreen } from "./LandingScreen.js";

describe("LandingScreen", () => {
  beforeEach(() => {
    useAuthStore.setState({ auth: { status: "anonymous" }, error: null, isSubmitting: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to login mode and toggles to signup", async () => {
    render(<LandingScreen />);
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /need an account/i }));

    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
  });

  it("submits login with the entered credentials", async () => {
    const loginSpy = vi.spyOn(api, "login").mockResolvedValue({ id: "u1", username: "alice" });
    render(<LandingScreen />);

    await userEvent.type(screen.getByLabelText("Username"), "alice");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(loginSpy).toHaveBeenCalledWith("alice", "correct-horse-battery");
  });

  it("plays as guest", async () => {
    const guestSpy = vi.spyOn(api, "playAsGuest").mockResolvedValue({ guest: true });
    render(<LandingScreen />);

    await userEvent.click(screen.getByRole("button", { name: "Play as guest" }));

    expect(guestSpy).toHaveBeenCalled();
  });

  it("shows a friendly error message on failed login", async () => {
    vi.spyOn(api, "login").mockRejectedValue(
      new api.ApiError(401, { error: "invalid_credentials" }),
    );
    render(<LandingScreen />);

    await userEvent.type(screen.getByLabelText("Username"), "alice");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Incorrect username or password.")).toBeInTheDocument();
  });

  it("hides the guest button and shows cancel when used as a signup prompt", () => {
    const onCancel = vi.fn();
    render(<LandingScreen initialMode="signup" onCancel={onCancel} />);

    expect(screen.queryByRole("button", { name: "Play as guest" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
  });
});
