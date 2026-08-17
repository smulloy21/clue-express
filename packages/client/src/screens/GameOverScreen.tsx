import { CardChip } from "../components/CardChip.js";
import { playerLabel, withNicknames } from "../game/format.js";
import { useAuthStore } from "../store/authStore.js";
import { useBotNameStore } from "../store/botNameStore.js";
import { useGameStore } from "../store/gameStore.js";

interface GameOverScreenProps {
  onPlayAgain: () => void;
  onSignUp: () => void;
}

export function GameOverScreen({ onPlayAgain, onSignUp }: GameOverScreenProps) {
  const state = useGameStore((s) => s.state);
  const reset = useGameStore((s) => s.reset);
  const auth = useAuthStore((s) => s.auth);
  const nicknames = useBotNameStore((s) => s.nicknames);

  if (!state || state.status !== "finished" || !state.solution) {
    return null;
  }

  const viewerSeat = state.viewerSeat;
  const youWon = state.winnerSeat === viewerSeat;
  const someoneWon = state.winnerSeat !== null;
  const displayPlayers = withNicknames(state.players, nicknames);
  const winner = someoneWon ? displayPlayers.find((p) => p.seat === state.winnerSeat) : undefined;

  function handlePlayAgain(): void {
    reset();
    onPlayAgain();
  }

  return (
    <div className="screen">
      <div className="panel stack">
        <h2>Game over</h2>
        <p>
          {youWon
            ? "You solved the case! You win."
            : someoneWon && winner
              ? `${playerLabel(winner, viewerSeat)} solved the case and wins.`
              : "Nobody accused correctly — no winner."}
        </p>

        <div className="stack">
          <span className="muted">The solution was:</span>
          <div className="row">
            <CardChip card={state.solution.suspect} />
            <CardChip card={state.solution.weapon} />
            <CardChip card={state.solution.room} />
          </div>
        </div>

        <div className="row">
          <button type="button" className="btn btn-primary" onClick={handlePlayAgain}>
            Play again
          </button>
        </div>

        {auth.status === "guest" && (
          <div className="panel">
            <p className="muted">Create an account to save your game record.</p>
            <button type="button" className="btn" onClick={onSignUp}>
              Sign up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
