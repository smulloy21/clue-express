import type { CardName, RedactedGameEvent, RedactedPlayer } from "@clue/engine";
import { useMemo } from "react";
import { describeEvent } from "../game/format.js";
import { explainTurn } from "../game/trainingExplanation.js";
import type { PlayerMode } from "../store/notepadStore.js";

interface TurnPausePanelProps {
  mode: PlayerMode;
  ownSeat: number;
  ownHand: readonly CardName[];
  playerCount: number;
  players: readonly RedactedPlayer[];
  turnGroups: readonly (readonly RedactedGameEvent[])[];
  pendingTurnIndex: number;
  onContinue: () => void;
}

export function TurnPausePanel({
  mode,
  ownSeat,
  ownHand,
  playerCount,
  players,
  turnGroups,
  pendingTurnIndex,
  onContinue,
}: TurnPausePanelProps) {
  const turnEvents = turnGroups[pendingTurnIndex] ?? [];
  const turnSummary = turnEvents.map((event) => describeEvent(event, players, ownSeat));

  const explanation = useMemo(
    () =>
      mode === "training"
        ? explainTurn(ownSeat, ownHand, playerCount, players, turnGroups, pendingTurnIndex)
        : null,
    [mode, ownSeat, ownHand, playerCount, players, turnGroups, pendingTurnIndex],
  );

  return (
    <div className="panel turn-pause-panel stack">
      <h2>💡 What just happened</h2>
      <div className="stack">
        {turnSummary.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {explanation ? (
        <div className="stack explanation">
          {explanation.direct.length > 0 && (
            <div>
              <h4>Directly observed</h4>
              <ul>
                {explanation.direct.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {explanation.deduced.length > 0 && (
            <div>
              <h4>Also deduced by elimination</h4>
              <ul>
                {explanation.deduced.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="muted">Update your notes, then continue.</p>
      )}

      <div className="row">
        <button type="button" className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
