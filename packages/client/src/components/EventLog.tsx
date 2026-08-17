import type { RedactedGameEvent, RedactedPlayer } from "@clue/engine";
import { useEffect, useRef } from "react";
import { describeEvent, eventActorSeat } from "../game/format.js";

interface EventLogProps {
  events: readonly RedactedGameEvent[];
  players: readonly RedactedPlayer[];
  viewerSeat: number;
}

export function EventLog({ events, players, viewerSeat }: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events.length]);

  if (events.length === 0) {
    return <p className="muted">No events yet.</p>;
  }

  return (
    <div className="event-log" ref={scrollRef}>
      {events.map((event, i) => {
        // Every turn starts with a "guess" event, so a guess (other than the very first event)
        // marks the start of a new turn — a natural place for a divider.
        const isNewTurn = i > 0 && event.type === "guess";
        const classes = ["event-entry"];
        if (eventActorSeat(event) === viewerSeat) classes.push("is-you");
        if (isNewTurn) classes.push("turn-boundary");

        return (
          <div key={event.index} className={classes.join(" ")}>
            {describeEvent(event, players, viewerSeat)}
          </div>
        );
      })}
    </div>
  );
}
