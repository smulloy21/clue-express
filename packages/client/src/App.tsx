import { useEffect, useState } from "react";
import { GameOverScreen } from "./screens/GameOverScreen.js";
import { GameTableScreen } from "./screens/GameTableScreen.js";
import { LandingScreen } from "./screens/LandingScreen.js";
import { NewGameScreen } from "./screens/NewGameScreen.js";
import { RecordsScreen } from "./screens/RecordsScreen.js";
import { useAuthStore } from "./store/authStore.js";
import { useGameStore } from "./store/gameStore.js";

type View = "new-game" | "records" | "signup-prompt";

export function App() {
  const auth = useAuthStore((s) => s.auth);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const gameState = useGameStore((s) => s.state);
  const isRevealing = useGameStore((s) => s.isRevealing);
  const [view, setView] = useState<View>("new-game");

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (auth.status === "authenticated" || auth.status === "guest") {
      setView((v) => (v === "signup-prompt" ? "new-game" : v));
    }
  }, [auth.status]);

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
    body =
      gameState.status === "finished" && !isRevealing ? (
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
        <h1>Boardless Clue</h1>
        {auth.status !== "loading" && auth.status !== "anonymous" && (
          <span className="identity">{auth.status === "guest" ? "Guest" : auth.username}</span>
        )}
      </header>
      {body}
    </div>
  );
}
