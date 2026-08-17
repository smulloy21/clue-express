import { describeEvent, withNicknames } from "../game/format.js";
import { useBotNameStore } from "../store/botNameStore.js";
import { useGameStore } from "../store/gameStore.js";
import { CardChip } from "./CardChip.js";

export function DisprovalPanel() {
  const state = useGameStore((s) => s.state);
  const disprove = useGameStore((s) => s.disprove);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const nicknames = useBotNameStore((s) => s.nicknames);

  const options = state?.turn.pending?.options;
  if (!state || !options) {
    return null;
  }

  const guessEvent = [...state.events].reverse().find((e) => e.type === "guess");
  const displayPlayers = withNicknames(state.players, nicknames);

  return (
    <div className="panel disproval-panel stack">
      <h3>Choose a card to show</h3>
      {guessEvent && <p>{describeEvent(guessEvent, displayPlayers, state.viewerSeat)}</p>}
      <p className="muted">
        You hold more than one matching card — pick exactly one to reveal to the guesser. Only they
        will see which card you chose. The event log and notepad below are still visible if you want
        to think it through first.
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
  );
}
