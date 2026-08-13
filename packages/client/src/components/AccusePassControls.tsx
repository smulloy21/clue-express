import { useState } from "react";
import { useGameStore } from "../store/gameStore.js";
import { AccuseDialog } from "./AccuseDialog.js";

export function AccusePassControls() {
  const [showAccuseDialog, setShowAccuseDialog] = useState(false);
  const pass = useGameStore((s) => s.pass);
  const isSubmitting = useGameStore((s) => s.isSubmitting);

  return (
    <div className="stack">
      <h3>Your turn: accuse or pass</h3>
      <div className="row">
        <button type="button" className="btn" disabled={isSubmitting} onClick={() => void pass()}>
          Pass
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={isSubmitting}
          onClick={() => setShowAccuseDialog(true)}
        >
          Make final accusation…
        </button>
      </div>
      {showAccuseDialog && <AccuseDialog onClose={() => setShowAccuseDialog(false)} />}
    </div>
  );
}
