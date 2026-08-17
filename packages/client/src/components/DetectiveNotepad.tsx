import type { Belief, CardName, RedactedGameEvent, RedactedPlayer } from "@clue/engine";
import { useMemo } from "react";
import { computeNotepadRows } from "../game/notepad.js";
import { orderPlayersForColumns, playerLabel } from "../game/format.js";

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
  const orderedPlayers = orderPlayersForColumns(players, ownSeat);
  const envelopeIndex = players.length;

  return (
    <div className="notepad-scroll">
      <table className="notepad">
        <thead>
          <tr>
            <th>Card</th>
            {orderedPlayers.map((p) => (
              <th key={p.seat}>{playerLabel(p, ownSeat)}</th>
            ))}
            <th>Envelope</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.card}
              className={
                i > 0 && rows[i - 1]!.category !== row.category ? "category-boundary" : undefined
              }
            >
              <td className="card-name">
                <span className="notepad-card-label">
                  <span className={`category-dot category-${row.category}`} />
                  {row.card}
                </span>
              </td>
              {orderedPlayers.map((p) => (
                <td key={p.seat} className={`belief-${row.cells[p.seat]}`}>
                  {beliefSymbol(row.cells[p.seat]!)}
                </td>
              ))}
              <td className={`belief-${row.cells[envelopeIndex]}`}>
                {beliefSymbol(row.cells[envelopeIndex]!)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
