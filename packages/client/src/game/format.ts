import type { RedactedGameEvent, RedactedPlayer } from "@clue/engine";

export function playerLabel(player: RedactedPlayer, viewerSeat: number): string {
  if (player.seat === viewerSeat) {
    return "You";
  }
  if (player.type === "human") {
    return `Player ${player.seat}`;
  }
  return `Bot ${player.seat} (${player.difficulty})`;
}

function findPlayer(players: readonly RedactedPlayer[], seat: number): RedactedPlayer {
  const player = players.find((p) => p.seat === seat);
  if (!player) {
    throw new Error(`no player at seat ${seat}`);
  }
  return player;
}

export function eventActorSeat(event: RedactedGameEvent): number {
  switch (event.type) {
    case "guess":
    case "no_disproval":
    case "pass":
    case "accusation":
      return event.seat;
    case "disprove":
      return event.disproverSeat;
    case "game_over":
      return event.winnerSeat ?? -1;
  }
}

export function describeEvent(
  event: RedactedGameEvent,
  players: readonly RedactedPlayer[],
  viewerSeat: number,
): string {
  const label = (seat: number) => playerLabel(findPlayer(players, seat), viewerSeat);

  switch (event.type) {
    case "guess":
      return `${label(event.seat)} guessed ${event.guess.suspect}, ${event.guess.weapon}, in the ${event.guess.room}.`;
    case "no_disproval":
      return `${label(event.seat)} could not disprove.`;
    case "disprove":
      return event.card !== undefined
        ? `${label(event.disproverSeat)} showed ${label(event.guesserSeat)} the ${event.card}.`
        : `${label(event.disproverSeat)} disproved ${label(event.guesserSeat)}'s guess.`;
    case "pass":
      return `${label(event.seat)} passed.`;
    case "accusation":
      return `${label(event.seat)} accused ${event.accusation.suspect}, ${event.accusation.weapon}, in the ${event.accusation.room} — ${
        event.correct ? "correct!" : "incorrect."
      }`;
    case "game_over":
      return event.winnerSeat !== null
        ? `${label(event.winnerSeat)} wins!`
        : "No winner — game over.";
  }
}
