import { ALL_CARDS, type Belief, type RedactedPlayer } from "@clue/engine";
import { orderPlayersForColumns, playerLabel } from "../game/format.js";
import { useNotepadStore } from "../store/notepadStore.js";

interface ManualNotepadProps {
  ownSeat: number;
  players: readonly RedactedPlayer[];
}

function beliefSymbol(belief: Belief): string {
  if (belief === "yes") return "✓";
  if (belief === "no") return "✕";
  return "·";
}

export function ManualNotepad({ ownSeat, players }: ManualNotepadProps) {
  const manualNotes = useNotepadStore((s) => s.manualNotes);
  const cycleCell = useNotepadStore((s) => s.cycleCell);

  if (!manualNotes) {
    return null;
  }

  const orderedPlayers = orderPlayersForColumns(players, ownSeat);
  const holderKeys = [...orderedPlayers.map((p) => String(p.seat)), "envelope"];

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
          {ALL_CARDS.map(({ name, category }, i) => (
            <tr
              key={name}
              className={
                i > 0 && ALL_CARDS[i - 1]!.category !== category ? "category-boundary" : undefined
              }
            >
              <td className="card-name">
                <span className="notepad-card-label">
                  <span className={`category-dot category-${category}`} />
                  {name}
                </span>
              </td>
              {holderKeys.map((holderKey) => {
                const belief = manualNotes[name]![holderKey]!;
                return (
                  <td key={holderKey} className={`belief-${belief}`}>
                    <button
                      type="button"
                      className="notepad-cell"
                      onClick={() => cycleCell(name, holderKey)}
                      aria-label={`${name} — ${
                        holderKey === "envelope"
                          ? "Envelope"
                          : playerLabel(
                              orderedPlayers.find((p) => String(p.seat) === holderKey)!,
                              ownSeat,
                            )
                      }`}
                    >
                      {beliefSymbol(belief)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
