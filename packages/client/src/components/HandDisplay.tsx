import type { CardName } from "@clue/engine";
import { CardChip } from "./CardChip.js";

export function HandDisplay({ hand }: { hand: readonly CardName[] }) {
  return (
    <div className="hand-grid">
      {hand.map((card) => (
        <CardChip key={card} card={card} />
      ))}
    </div>
  );
}
