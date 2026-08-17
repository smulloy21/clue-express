import type { RedactedGameState, RedactedPlayer } from "@clue/engine";
import { useMemo } from "react";
import { AccusePassControls } from "../components/AccusePassControls.js";
import { DetectiveNotepad } from "../components/DetectiveNotepad.js";
import { DisprovalPanel } from "../components/DisprovalPanel.js";
import { EventLog } from "../components/EventLog.js";
import { GuessBuilder } from "../components/GuessBuilder.js";
import { HandDisplay } from "../components/HandDisplay.js";
import { ManualNotepad } from "../components/ManualNotepad.js";
import { TurnPausePanel } from "../components/TurnPausePanel.js";
import { playerLabel, withNicknames } from "../game/format.js";
import { computeRevealState } from "../game/turns.js";
import { useBotNameStore } from "../store/botNameStore.js";
import { useGameStore } from "../store/gameStore.js";
import { useNotepadStore } from "../store/notepadStore.js";

function describeTurnBanner(
  state: RedactedGameState,
  players: readonly RedactedPlayer[],
  viewerSeat: number,
  isMyGuessTurn: boolean,
  isMyDisprovalTurn: boolean,
  isMyAccuseOrPassTurn: boolean,
): string {
  const playerAt = (seat: number): RedactedPlayer => players.find((p) => p.seat === seat)!;

  if (state.turn.phase === "guess") {
    return isMyGuessTurn
      ? "Your turn: make a guess."
      : `Waiting on ${playerLabel(playerAt(state.turn.currentSeat), viewerSeat)}…`;
  }
  if (state.turn.phase === "awaiting_disproval") {
    return isMyDisprovalTurn
      ? "You must show a card."
      : `Waiting on ${playerLabel(playerAt(state.turn.pending!.disproverSeat), viewerSeat)} to disprove…`;
  }
  return isMyAccuseOrPassTurn
    ? "Your turn: accuse or pass."
    : `Waiting on ${playerLabel(playerAt(state.turn.currentSeat), viewerSeat)}…`;
}

export function GameTableScreen() {
  const state = useGameStore((s) => s.state);
  const actionError = useGameStore((s) => s.actionError);
  const mode = useNotepadStore((s) => s.mode);
  const revealedTurnCount = useNotepadStore((s) => s.revealedTurnCount);
  const continueTurn = useNotepadStore((s) => s.continueTurn);
  const nicknames = useBotNameStore((s) => s.nicknames);

  const liveTurnIsIncomplete =
    state?.turn.phase === "awaiting_disproval" &&
    state.turn.pending?.disproverSeat === state.viewerSeat;

  const revealState = useMemo(
    () => computeRevealState(state?.events ?? [], revealedTurnCount, liveTurnIsIncomplete),
    [state?.events, revealedTurnCount, liveTurnIsIncomplete],
  );

  if (!state) {
    return null;
  }

  const { turnGroups, visibleEventCount, isCaughtUp, pendingTurnIndex } = revealState;

  const viewerSeat = state.viewerSeat;
  const displayPlayers = withNicknames(state.players, nicknames);
  const ownPlayer = displayPlayers.find((p) => p.seat === viewerSeat)!;
  const ownHand = ownPlayer.hand ?? [];

  const controlsActive = state.status === "in_progress" && isCaughtUp;
  const isMyGuessTurn =
    controlsActive && state.turn.phase === "guess" && state.turn.currentSeat === viewerSeat;
  const isMyDisprovalTurn =
    controlsActive &&
    state.turn.phase === "awaiting_disproval" &&
    state.turn.pending?.disproverSeat === viewerSeat;
  const isMyAccuseOrPassTurn =
    controlsActive &&
    state.turn.phase === "accuse_or_pass" &&
    state.turn.currentSeat === viewerSeat;

  const bannerText = isCaughtUp
    ? describeTurnBanner(
        state,
        displayPlayers,
        viewerSeat,
        isMyGuessTurn,
        isMyDisprovalTurn,
        isMyAccuseOrPassTurn,
      )
    : "Catching up on previous turns…";

  return (
    <div className="screen">
      <div className="panel">
        <h2>Your hand</h2>
        <HandDisplay hand={ownHand} />
      </div>

      <div className={`turn-banner ${isMyGuessTurn || isMyAccuseOrPassTurn ? "is-active" : ""}`}>
        {bannerText}
      </div>

      {!isCaughtUp && pendingTurnIndex !== null && (
        <TurnPausePanel
          mode={mode}
          ownSeat={viewerSeat}
          ownHand={ownHand}
          playerCount={state.players.length}
          players={displayPlayers}
          turnGroups={turnGroups}
          pendingTurnIndex={pendingTurnIndex}
          onContinue={() => continueTurn(turnGroups.length)}
        />
      )}

      {(isMyGuessTurn || isMyAccuseOrPassTurn) && (
        <div className="panel">
          {isMyGuessTurn && <GuessBuilder />}
          {isMyAccuseOrPassTurn && <AccusePassControls />}
        </div>
      )}
      {isMyDisprovalTurn && <DisprovalPanel />}

      {actionError && <p className="error-text">{actionError}</p>}

      <div className="panel">
        <h2>Event log</h2>
        <EventLog
          events={state.events.slice(0, visibleEventCount)}
          players={displayPlayers}
          viewerSeat={viewerSeat}
        />
      </div>

      <div className="panel">
        <h2>Detective notepad</h2>
        {mode === "training" ? (
          <DetectiveNotepad
            ownSeat={viewerSeat}
            ownHand={ownHand}
            players={displayPlayers}
            events={state.events}
          />
        ) : (
          <ManualNotepad ownSeat={viewerSeat} players={displayPlayers} />
        )}
      </div>
    </div>
  );
}
