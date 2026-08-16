import { useState, type FormEvent } from "react";
import { useAuthStore } from "../store/authStore.js";

interface LandingScreenProps {
  initialMode?: "login" | "signup";
  onCancel?: () => void;
}

export function LandingScreen({ initialMode = "login", onCancel }: LandingScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const playAsGuest = useAuthStore((s) => s.playAsGuest);
  const error = useAuthStore((s) => s.error);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (mode === "login") {
      await login(username, password);
    } else {
      await signup(username, password);
    }
  }

  return (
    <div className="screen">
      <div className="panel stack">
        <h2>Clue Express</h2>
        <p className="muted">Play a deduction game against two AI opponents.</p>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {mode === "login" ? "Log in" : "Sign up"}
            </button>
            <button
              type="button"
              className="btn-link"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </form>

        {!onCancel && (
          <div className="row">
            <span className="muted">or</span>
            <button
              type="button"
              className="btn"
              disabled={isSubmitting}
              onClick={() => void playAsGuest()}
            >
              Play as guest
            </button>
          </div>
        )}

        {onCancel && (
          <button type="button" className="btn-link" onClick={onCancel}>
            Never mind, go back
          </button>
        )}
      </div>
    </div>
  );
}
