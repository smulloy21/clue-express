import { ROOMS, SUSPECTS, WEAPONS, type Room, type Suspect, type Weapon } from "@clue/engine";
import { useState } from "react";
import { useGameStore } from "../store/gameStore.js";

export function GuessBuilder() {
  const [suspect, setSuspect] = useState<Suspect>(SUSPECTS[0]!);
  const [weapon, setWeapon] = useState<Weapon>(WEAPONS[0]!);
  const [room, setRoom] = useState<Room>(ROOMS[0]!);
  const guess = useGameStore((s) => s.guess);
  const isSubmitting = useGameStore((s) => s.isSubmitting);

  return (
    <div className="stack">
      <h3>Your turn: make a guess</h3>
      <p className="muted">Any combination is allowed, including cards in your own hand.</p>
      <div className="row">
        <div className="field">
          <label htmlFor="guess-suspect">Suspect</label>
          <select
            id="guess-suspect"
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
          <label htmlFor="guess-weapon">Weapon</label>
          <select
            id="guess-weapon"
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
          <label htmlFor="guess-room">Room</label>
          <select id="guess-room" value={room} onChange={(e) => setRoom(e.target.value as Room)}>
            {ROOMS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={isSubmitting}
          onClick={() => void guess({ suspect, weapon, room })}
        >
          Guess
        </button>
      </div>
    </div>
  );
}
