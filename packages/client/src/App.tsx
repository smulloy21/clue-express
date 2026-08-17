import { useEffect, useState } from "react";
import { GameOverScreen } from "./screens/GameOverScreen.js";
import { GameTableScreen } from "./screens/GameTableScreen.js";
import { LandingScreen } from "./screens/LandingScreen.js";
import { NewGameScreen } from "./screens/NewGameScreen.js";
import { RecordsScreen } from "./screens/RecordsScreen.js";
import { computeRevealState } from "./game/turns.js";
import { useAuthStore } from "./store/authStore.js";
import { useBotNameStore } from "./store/botNameStore.js";
import { useGameStore } from "./store/gameStore.js";
import { useNotepadStore } from "./store/notepadStore.js";

type View = "new-game" | "records" | "signup-prompt";

export function App() {
  const auth = useAuthStore((s) => s.auth);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const gameState = useGameStore((s) => s.state);
  const revealedTurnCount = useNotepadStore((s) => s.revealedTurnCount);
  const resetNotepad = useNotepadStore((s) => s.reset);
  const resetBotNames = useBotNameStore((s) => s.reset);
  const [view, setView] = useState<View>("new-game");

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (auth.status === "authenticated" || auth.status === "guest") {
      setView((v) => (v === "signup-prompt" ? "new-game" : v));
    }
  }, [auth.status]);

  useEffect(() => {
    if (!gameState) {
      resetNotepad();
      resetBotNames();
    }
  }, [gameState, resetNotepad, resetBotNames]);

  let body: React.ReactNode;
  if (auth.status === "loading") {
    body = <p className="muted">Loading…</p>;
  } else if (auth.status === "anonymous" || view === "signup-prompt") {
    body =
      view === "signup-prompt" ? (
        <LandingScreen initialMode="signup" onCancel={() => setView("new-game")} />
      ) : (
        <LandingScreen initialMode="login" />
      );
  } else if (gameState) {
    const { isCaughtUp } = computeRevealState(gameState.events, revealedTurnCount);
    body =
      gameState.status === "finished" && isCaughtUp ? (
        <GameOverScreen
          onPlayAgain={() => setView("new-game")}
          onSignUp={() => setView("signup-prompt")}
        />
      ) : (
        <GameTableScreen />
      );
  } else if (view === "records") {
    body = <RecordsScreen onBack={() => setView("new-game")} />;
  } else {
    body = <NewGameScreen onViewRecords={() => setView("records")} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Clue Express</h1>
        {auth.status !== "loading" && auth.status !== "anonymous" && (
          <span className="identity">{auth.status === "guest" ? "Guest" : auth.username}</span>
        )}
      </header>
      {body}
    </div>
  );
}
