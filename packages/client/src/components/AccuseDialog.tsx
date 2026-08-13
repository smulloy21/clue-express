import { ROOMS, SUSPECTS, WEAPONS, type Room, type Suspect, type Weapon } from "@clue/engine";
import { useState } from "react";
import { useGameStore } from "../store/gameStore.js";

export function AccuseDialog({ onClose }: { onClose: () => void }) {
  const [suspect, setSuspect] = useState<Suspect>(SUSPECTS[0]!);
  const [weapon, setWeapon] = useState<Weapon>(WEAPONS[0]!);
  const [room, setRoom] = useState<Room>(ROOMS[0]!);
  const [confirming, setConfirming] = useState(false);
  const accuse = useGameStore((s) => s.accuse);
  const isSubmitting = useGameStore((s) => s.isSubmitting);

  async function handleConfirm(): Promise<void> {
    await accuse({ suspect, weapon, room });
    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box stack">
        <h3>Make a final accusation</h3>
        {!confirming ? (
          <>
            <p className="muted">
              If you're wrong, you can never win this game — you'll still have to disprove other
              players' guesses, but your own turns are over.
            </p>
            <div className="row">
              <div className="field">
                <label htmlFor="accuse-suspect">Suspect</label>
                <select
                  id="accuse-suspect"
                  value={suspect}
                  onChange={(e) => setSuspect(e.target.value as Suspect)}
                >
                  {SUSPECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="accuse-weapon">Weapon</label>
                <select
                  id="accuse-weapon"
                  value={weapon}
                  onChange={(e) => setWeapon(e.target.value as Weapon)}
                >
                  {WEAPONS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="accuse-room">Room</label>
                <select
                  id="accuse-room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value as Room)}
                >
                  {ROOMS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
                Accuse…
              </button>
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="stack">
            <p>
              Are you sure? Accusing <strong>{suspect}</strong>, <strong>{weapon}</strong>, in the{" "}
              <strong>{room}</strong>. This is final.
            </p>
            <div className="row">
              <button
                type="button"
                className="btn btn-danger"
                disabled={isSubmitting}
                onClick={() => void handleConfirm()}
              >
                Yes, accuse
              </button>
              <button type="button" className="btn" onClick={() => setConfirming(false)}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
