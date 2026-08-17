import { categoryOfCard, type RedactedGameEvent, type RedactedPlayer } from "@clue/engine";

/** A player decorated with its assigned nickname, when one exists (bots only). */
export interface DisplayPlayer extends RedactedPlayer {
  nickname?: string;
}

export function playerLabel(player: DisplayPlayer, viewerSeat: number): string {
  if (player.seat === viewerSeat) {
    return "You";
  }
  if (player.type === "human") {
    return `Player ${player.seat}`;
  }
  return `${player.nickname ?? `Bot ${player.seat}`} (${player.difficulty})`;
}

/** Attaches each bot's assigned nickname (if any) for display purposes only. */
export function withNicknames(
  players: readonly RedactedPlayer[],
  nicknames: Record<number, string>,
): DisplayPlayer[] {
  return players.map((p) => {
    const nickname = nicknames[p.seat];
    return nickname ? { ...p, nickname } : p;
  });
}

/**
 * Notepad columns always show the viewer first, then the remaining players in turn order
 * (clockwise from the viewer's own seat) — so reading left to right matches who goes next.
 */
export function orderPlayersForColumns(
  players: readonly RedactedPlayer[],
  ownSeat: number,
): RedactedPlayer[] {
  const own = players.find((p) => p.seat === ownSeat);
  const playerCount = players.length;
  const turnsAfterOwn = (seat: number) => (seat - ownSeat + playerCount) % playerCount;
  const others = players
    .filter((p) => p.seat !== ownSeat)
    .sort((a, b) => turnsAfterOwn(a.seat) - turnsAfterOwn(b.seat));
  return own ? [own, ...others] : others;
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
        ? `${label(event.disproverSeat)} showed ${label(event.guesserSeat)} ${
            categoryOfCard(event.card) === "suspect" ? "" : "the "
          }${event.card}.`
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
