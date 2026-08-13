import { useGameStore } from "../store/gameStore.js";
import { CardChip } from "./CardChip.js";

export function DisprovalModal() {
  const options = useGameStore((s) => s.state?.turn.pending?.options);
  const disprove = useGameStore((s) => s.disprove);
  const isSubmitting = useGameStore((s) => s.isSubmitting);

  if (!options) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box stack">
        <h3>Choose a card to show</h3>
        <p className="muted">
          You hold more than one matching card — pick exactly one to reveal to the guesser. Only
          they will see which card you chose.
        </p>
        <div className="row">
          {options.map((card) => (
            <button
              key={card}
              type="button"
              className="btn"
              disabled={isSubmitting}
              onClick={() => void disprove(card)}
            >
              <CardChip card={card} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
