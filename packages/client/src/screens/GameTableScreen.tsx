import type { RedactedGameState, RedactedPlayer } from "@clue/engine";
import { AccusePassControls } from "../components/AccusePassControls.js";
import { DetectiveNotepad } from "../components/DetectiveNotepad.js";
import { DisprovalModal } from "../components/DisprovalModal.js";
import { EventLog } from "../components/EventLog.js";
import { GuessBuilder } from "../components/GuessBuilder.js";
import { HandDisplay } from "../components/HandDisplay.js";
import { playerLabel } from "../game/format.js";
import { useGameStore } from "../store/gameStore.js";

function describeTurnBanner(
  state: RedactedGameState,
  players: readonly RedactedPlayer[],
  viewerSeat: number,
  isRevealing: boolean,
  isMyGuessTurn: boolean,
  isMyDisprovalTurn: boolean,
  isMyAccuseOrPassTurn: boolean,
): string {
  const playerAt = (seat: number): RedactedPlayer => players.find((p) => p.seat === seat)!;

  if (isRevealing) {
    return "Watching the previous turn play out…";
  }
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
  const visibleEventCount = useGameStore((s) => s.visibleEventCount);
  const isRevealing = useGameStore((s) => s.isRevealing);
  const actionError = useGameStore((s) => s.actionError);

  if (!state) {
    return null;
  }

  const viewerSeat = state.viewerSeat;
  const ownPlayer = state.players.find((p) => p.seat === viewerSeat)!;
  const visibleEvents = state.events.slice(0, visibleEventCount);

  const isMyGuessTurn =
    !isRevealing && state.turn.phase === "guess" && state.turn.currentSeat === viewerSeat;
  const isMyDisprovalTurn =
    !isRevealing &&
    state.turn.phase === "awaiting_disproval" &&
    state.turn.pending?.disproverSeat === viewerSeat;
  const isMyAccuseOrPassTurn =
    !isRevealing && state.turn.phase === "accuse_or_pass" && state.turn.currentSeat === viewerSeat;

  const bannerText = describeTurnBanner(
    state,
    state.players,
    viewerSeat,
    isRevealing,
    isMyGuessTurn,
    isMyDisprovalTurn,
    isMyAccuseOrPassTurn,
  );

  return (
    <div className="screen">
      <div className="panel">
        <h2>Your hand</h2>
        <HandDisplay hand={ownPlayer.hand ?? []} />
      </div>

      <div className={`turn-banner ${isMyGuessTurn || isMyAccuseOrPassTurn ? "is-active" : ""}`}>
        {bannerText}
      </div>

      {(isMyGuessTurn || isMyAccuseOrPassTurn) && (
        <div className="panel">
          {isMyGuessTurn && <GuessBuilder />}
          {isMyAccuseOrPassTurn && <AccusePassControls />}
        </div>
      )}
      {isMyDisprovalTurn && <DisprovalModal />}

      {actionError && <p className="error-text">{actionError}</p>}

      <div className="panel">
        <h2>Event log</h2>
        <EventLog events={visibleEvents} players={state.players} viewerSeat={viewerSeat} />
      </div>

      <div className="panel">
        <h2>Detective notepad</h2>
        <DetectiveNotepad
          ownSeat={viewerSeat}
          ownHand={ownPlayer.hand ?? []}
          players={state.players}
          events={visibleEvents}
        />
      </div>
    </div>
  );
}
