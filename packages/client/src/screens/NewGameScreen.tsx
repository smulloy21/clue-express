import type { BotDifficulty } from "@clue/engine";
import { useState } from "react";
import { useAuthStore } from "../store/authStore.js";
import { useGameStore } from "../store/gameStore.js";

interface NewGameScreenProps {
  onViewRecords: () => void;
}

export function NewGameScreen({ onViewRecords }: NewGameScreenProps) {
  const [bot1, setBot1] = useState<BotDifficulty>("easy");
  const [bot2, setBot2] = useState<BotDifficulty>("hard");
  const [daily, setDaily] = useState(false);
  const auth = useAuthStore((s) => s.auth);
  const logout = useAuthStore((s) => s.logout);
  const startGame = useGameStore((s) => s.startGame);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const actionError = useGameStore((s) => s.actionError);

  const identity = auth.status === "authenticated" ? auth.username : "Guest";

  return (
    <div className="screen">
      <div className="panel stack">
        <h2>New game</h2>
        <p className="muted">Playing as {identity}. Choose a difficulty for each opponent.</p>

        <div className="row">
          <div className="field">
            <label htmlFor="bot1">Opponent 1</label>
            <select
              id="bot1"
              value={bot1}
              onChange={(e) => setBot1(e.target.value as BotDifficulty)}
            >
              <option value="easy">Easy</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bot2">Opponent 2</label>
            <select
              id="bot2"
              value={bot2}
              onChange={(e) => setBot2(e.target.value as BotDifficulty)}
            >
              <option value="easy">Easy</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <label className="row">
          <input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} />
          <span>Play today's daily challenge (same deal for everyone today)</span>
        </label>

        {actionError && <p className="error-text">{actionError}</p>}

        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={isSubmitting}
            onClick={() => void startGame([bot1, bot2], daily)}
          >
            {isSubmitting ? "Starting…" : "Start game"}
          </button>
          {auth.status === "authenticated" && (
            <button type="button" className="btn" onClick={onViewRecords}>
              My records
            </button>
          )}
          <button type="button" className="btn" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
