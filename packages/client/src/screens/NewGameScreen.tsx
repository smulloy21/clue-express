import type { BotDifficulty } from "@clue/engine";
import { useState } from "react";
import { HowToPlayModal } from "../components/HowToPlayModal.js";
import { useAuthStore } from "../store/authStore.js";
import { useBotNameStore } from "../store/botNameStore.js";
import { useGameStore } from "../store/gameStore.js";
import { useNotepadStore, type PlayerMode } from "../store/notepadStore.js";

interface NewGameScreenProps {
  onViewRecords: () => void;
}

export function NewGameScreen({ onViewRecords }: NewGameScreenProps) {
  const [bot1, setBot1] = useState<BotDifficulty>("easy");
  const [bot2, setBot2] = useState<BotDifficulty>("hard");
  const [mode, setMode] = useState<PlayerMode>("normal");
  const [daily, setDaily] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const auth = useAuthStore((s) => s.auth);
  const logout = useAuthStore((s) => s.logout);
  const startGame = useGameStore((s) => s.startGame);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const actionError = useGameStore((s) => s.actionError);
  const startNotepad = useNotepadStore((s) => s.startNewGame);
  const assignNicknames = useBotNameStore((s) => s.assignNicknames);

  const identity = auth.status === "authenticated" ? auth.username : "Guest";

  async function handleStart(): Promise<void> {
    const ok = await startGame([bot1, bot2], daily);
    if (!ok) {
      return;
    }
    const state = useGameStore.getState().state;
    if (state) {
      const ownHand = state.players.find((p) => p.seat === state.viewerSeat)?.hand ?? [];
      startNotepad(state.viewerSeat, state.players.length, ownHand, mode);
      const botSeats = state.players.filter((p) => p.type === "bot").map((p) => p.seat);
      assignNicknames(botSeats);
    }
  }

  return (
    <div className="screen">
      <div className="panel stack">
        <div className="row row-between">
          <h2>New game</h2>
          <button type="button" className="btn-link" onClick={() => setShowHowToPlay(true)}>
            How to play
          </button>
        </div>
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
          <div className="field">
            <label htmlFor="mode">Mode</label>
            <select id="mode" value={mode} onChange={(e) => setMode(e.target.value as PlayerMode)}>
              <option value="training">Training — see how deductions work</option>
              <option value="normal">Normal — take your own notes</option>
            </select>
          </div>
        </div>

        <label className="row daily-toggle">
          <input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} />
          <span>Play today's daily challenge (same deal for everyone today)</span>
        </label>

        {actionError && <p className="error-text">{actionError}</p>}

        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={isSubmitting}
            onClick={() => void handleStart()}
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

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
}
