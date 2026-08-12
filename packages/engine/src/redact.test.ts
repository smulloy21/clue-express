import { describe, expect, it } from "vitest";
import { ROOMS, SUSPECTS, WEAPONS, type CardName } from "./constants.js";
import { redactStateForPlayer } from "./redact.js";
import type { GameEvent, GameState, PlayerType, Solution, TurnPhase } from "./types.js";

const [S0, S1, S2, , , S5] = SUSPECTS;
const [W0, , , , , W5] = WEAPONS;
const [R0, , , , , , , , R8] = ROOMS;

const SOLUTION: Solution = { suspect: S5!, weapon: W5!, room: R8! };

function makeState(options: {
  hands: [CardName[], CardName[], CardName[]];
  types?: [PlayerType, PlayerType, PlayerType];
  status?: "in_progress" | "finished";
  events?: GameEvent[];
  currentSeat?: number;
  phase?: TurnPhase;
  pending?: { guesserSeat: number; disproverSeat: number; options: CardName[] };
}): GameState {
  const types = options.types ?? ["human", "bot", "bot"];
  return {
    seed: 0,
    status: options.status ?? "in_progress",
    solution: SOLUTION,
    players: types.map((type, seat) => ({
      type,
      ...(type === "bot" ? { difficulty: "easy" as const } : {}),
      seat,
      hand: options.hands[seat as 0 | 1 | 2],
      eliminated: false,
    })),
    turn: {
      currentSeat: options.currentSeat ?? 0,
      phase: options.phase ?? "guess",
      ...(options.pending ? { pending: options.pending } : {}),
    },
    winnerSeat: null,
    events: options.events ?? [],
  };
}

describe("redactStateForPlayer", () => {
  it("includes the viewer's own hand", () => {
    const state = makeState({ hands: [[S0!, S1!], [S2!], [W0!]] });
    const redacted = redactStateForPlayer(state, 0);
    expect(redacted.players[0]!.hand).toEqual([S0!, S1!]);
    expect(redacted.players[0]!.handSize).toBe(2);
  });

  it("never includes another player's hand contents", () => {
    const state = makeState({ hands: [[S0!, S1!], [S2!], [W0!]] });
    for (const viewerSeat of [0, 1, 2]) {
      const redacted = redactStateForPlayer(state, viewerSeat);
      for (const player of redacted.players) {
        if (player.seat !== viewerSeat) {
          expect(player.hand).toBeUndefined();
        }
      }
    }
  });

  it("reports hand sizes for every player regardless of viewer", () => {
    const state = makeState({ hands: [[S0!, S1!], [S2!], [W0!]] });
    const redacted = redactStateForPlayer(state, 1);
    expect(redacted.players.map((p) => p.handSize)).toEqual([2, 1, 1]);
  });

  it("withholds the solution while the game is in progress", () => {
    const state = makeState({ hands: [[S0!], [S1!], [S2!]], status: "in_progress" });
    const redacted = redactStateForPlayer(state, 0);
    expect(redacted.solution).toBeUndefined();
  });

  it("reveals the solution once the game has finished", () => {
    const state = makeState({ hands: [[S0!], [S1!], [S2!]], status: "finished" });
    const redacted = redactStateForPlayer(state, 1);
    expect(redacted.solution).toEqual(SOLUTION);
  });

  it("shows the disprove card to the guesser", () => {
    const state = makeState({
      hands: [[S0!], [S1!], [S2!]],
      events: [
        { index: 0, type: "guess", seat: 0, guess: { suspect: S2!, weapon: W0!, room: R0! } },
        { index: 1, type: "disprove", guesserSeat: 0, disproverSeat: 1, card: S1! },
      ],
    });
    const redacted = redactStateForPlayer(state, 0);
    expect(redacted.events[1]).toMatchObject({ type: "disprove", card: S1! });
  });

  it("shows the disprove card to the disprover themself", () => {
    const state = makeState({
      hands: [[S0!], [S1!], [S2!]],
      events: [
        { index: 0, type: "guess", seat: 0, guess: { suspect: S2!, weapon: W0!, room: R0! } },
        { index: 1, type: "disprove", guesserSeat: 0, disproverSeat: 1, card: S1! },
      ],
    });
    const redacted = redactStateForPlayer(state, 1);
    expect(redacted.events[1]).toMatchObject({ type: "disprove", card: S1! });
  });

  it("hides the disprove card from every other player", () => {
    const state = makeState({
      hands: [[S0!], [S1!], [S2!]],
      events: [
        { index: 0, type: "guess", seat: 0, guess: { suspect: S2!, weapon: W0!, room: R0! } },
        { index: 1, type: "disprove", guesserSeat: 0, disproverSeat: 1, card: S1! },
      ],
    });
    const redacted = redactStateForPlayer(state, 2);
    const disproveEvent = redacted.events[1] as { type: "disprove"; card?: CardName };
    expect(disproveEvent.type).toBe("disprove");
    expect(disproveEvent.card).toBeUndefined();
    expect(JSON.stringify(disproveEvent)).not.toContain(S1!);
  });

  it("reveals pending disproval options only to the disprover who must choose", () => {
    const state = makeState({
      hands: [[S0!], [S1!, W0!], [S2!]],
      phase: "awaiting_disproval",
      pending: { guesserSeat: 0, disproverSeat: 1, options: [S1!, W0!] },
    });

    const forDisprover = redactStateForPlayer(state, 1);
    expect(forDisprover.turn.pending).toEqual({
      guesserSeat: 0,
      disproverSeat: 1,
      options: [S1!, W0!],
    });

    const forGuesser = redactStateForPlayer(state, 0);
    expect(forGuesser.turn.pending).toEqual({ guesserSeat: 0, disproverSeat: 1 });

    const forBystander = redactStateForPlayer(state, 2);
    expect(forBystander.turn.pending).toEqual({ guesserSeat: 0, disproverSeat: 1 });
  });

  it("throws for an out-of-range seat", () => {
    const state = makeState({ hands: [[S0!], [S1!], [S2!]] });
    expect(() => redactStateForPlayer(state, 5)).toThrow(RangeError);
  });

  it("never leaks the solution or any non-viewer hand across every seat, in progress or finished", () => {
    for (const status of ["in_progress", "finished"] as const) {
      const state = makeState({ hands: [[S0!, S1!], [S2!], [W0!]], status });
      for (const viewerSeat of [0, 1, 2]) {
        const redacted = redactStateForPlayer(state, viewerSeat);
        const serialized = JSON.stringify(redacted);
        if (status === "in_progress") {
          expect(serialized).not.toContain('"solution"');
        }
        for (const player of redacted.players) {
          if (player.seat !== viewerSeat) {
            expect(player.hand).toBeUndefined();
          }
        }
      }
    }
  });
});
