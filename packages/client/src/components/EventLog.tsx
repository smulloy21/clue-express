import type { RedactedGameEvent, RedactedPlayer } from "@clue/engine";
import { describeEvent, eventActorSeat } from "../game/format.js";

interface EventLogProps {
  events: readonly RedactedGameEvent[];
  players: readonly RedactedPlayer[];
  viewerSeat: number;
}

export function EventLog({ events, players, viewerSeat }: EventLogProps) {
  if (events.length === 0) {
    return <p className="muted">No events yet.</p>;
  }

  return (
    <div className="event-log">
      {[...events].reverse().map((event) => (
        <div
          key={event.index}
          className={`event-entry ${eventActorSeat(event) === viewerSeat ? "is-you" : ""}`}
        >
          {describeEvent(event, players, viewerSeat)}
        </div>
      ))}
    </div>
  );
}
