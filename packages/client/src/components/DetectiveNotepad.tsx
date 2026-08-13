import type { Belief, CardName, RedactedGameEvent, RedactedPlayer } from "@clue/engine";
import { useMemo } from "react";
import { computeNotepadRows } from "../game/notepad.js";
import { playerLabel } from "../game/format.js";

interface DetectiveNotepadProps {
  ownSeat: number;
  ownHand: readonly CardName[];
  players: readonly RedactedPlayer[];
  events: readonly RedactedGameEvent[];
}

function beliefSymbol(belief: Belief): string {
  if (belief === "yes") return "✓";
  if (belief === "no") return "✕";
  return "·";
}

export function DetectiveNotepad({ ownSeat, ownHand, players, events }: DetectiveNotepadProps) {
  const rows = useMemo(
    () => computeNotepadRows(ownSeat, ownHand, players.length, events),
    [ownSeat, ownHand, players.length, events],
  );
  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);

  return (
    <div className="notepad-scroll">
      <table className="notepad">
        <thead>
          <tr>
            <th>Card</th>
            {sortedPlayers.map((p) => (
              <th key={p.seat}>{playerLabel(p, ownSeat)}</th>
            ))}
            <th>Envelope</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.card}>
              <td className="card-name">{row.card}</td>
              {row.cells.map((belief, i) => (
                <td key={i} className={`belief-${belief}`}>
                  {beliefSymbol(belief)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
