import { describe, expect, it } from "vitest";
import type { CardName } from "./constants.js";
import { ROOMS, SUSPECTS, WEAPONS } from "./constants.js";
import { accuse, createGame, pass, resolveDisproval, submitGuess } from "./game.js";
import type { GameState, PlayerType, Solution, TurnPhase } from "./types.js";
import { IllegalActionError } from "./types.js";

const [S0, S1, S2, S3, , S5] = SUSPECTS;
const [W0, W1, W2, W3, , W5] = WEAPONS;
const [R0, R1, R2, R3, , , , , R8] = ROOMS;

const SOLUTION: Solution = { suspect: S5!, weapon: W5!, room: R8! };

function makeState(options: {
  hands: [CardName[], CardName[], CardName[]];
  types?: [PlayerType, PlayerType, PlayerType];
  solution?: Solution;
  eliminated?: [boolean, boolean, boolean];
  currentSeat?: number;
  phase?: TurnPhase;
}): GameState {
  const types = options.types ?? ["human", "bot", "bot"];
  const eliminated = options.eliminated ?? [false, false, false];
  return {
    seed: 0,
    status: "in_progress",
    solution: options.solution ?? SOLUTION,
    players: types.map((type, seat) => ({
      type,
      ...(type === "bot" ? { difficulty: "easy" as const } : {}),
      seat,
      hand: options.hands[seat as 0 | 1 | 2],
      eliminated: eliminated[seat as 0 | 1 | 2],
    })),
    turn: { currentSeat: options.currentSeat ?? 0, phase: options.phase ?? "guess" },
    winnerSeat: null,
    events: [],
  };
}

describe("createGame", () => {
  it("creates exactly 3 seated players with 6 cards each", () => {
    const state = createGame({
      seed: 1,
      players: [
        { type: "human" },
        { type: "bot", difficulty: "easy" },
        { type: "bot", difficulty: "hard" },
      ],
    });
    expect(state.players).toHaveLength(3);
    for (const player of state.players) {
      expect(player.hand).toHaveLength(6);
      expect(player.eliminated).toBe(false);
    }
  });

  it("rejects a player count other than 3", () => {
    expect(() => createGame({ seed: 1, players: [{ type: "human" }, { type: "bot" }] })).toThrow(
      IllegalActionError,
    );
  });

  it("starts in_progress at seat 0's guess phase", () => {
    const state = createGame({
      seed: 1,
      players: [{ type: "human" }, { type: "bot" }, { type: "bot" }],
    });
    expect(state.status).toBe("in_progress");
    expect(state.turn).toEqual({ currentSeat: 0, phase: "guess" });
    expect(state.events).toEqual([]);
  });

  it("is deterministic given the same seed and player list", () => {
    const players = [
      { type: "human" as const },
      { type: "bot" as const, difficulty: "easy" as const },
      { type: "bot" as const, difficulty: "hard" as const },
    ];
    const a = createGame({ seed: 777, players });
    const b = createGame({ seed: 777, players });
    expect(a).toEqual(b);
  });

  it("deals a different arrangement for a different seed", () => {
    const players = [
      { type: "human" as const },
      { type: "bot" as const, difficulty: "easy" as const },
      { type: "bot" as const, difficulty: "hard" as const },
    ];
    const a = createGame({ seed: 1, players });
    const b = createGame({ seed: 2, players });
    expect(a.players.map((p) => p.hand)).not.toEqual(b.players.map((p) => p.hand));
  });
});

describe("submitGuess", () => {
  it("auto-resolves when exactly one downstream player can disprove", () => {
    const state = makeState({
      hands: [[S0!, W0!, R0!, S1!, W1!, R1!], [W2!], [S2!, R2!]],
    });
    const next = submitGuess(state, 0, { suspect: S0!, weapon: W2!, room: R2! });

    expect(next.events).toEqual([
      { index: 0, type: "guess", seat: 0, guess: { suspect: S0!, weapon: W2!, room: R2! } },
      { index: 1, type: "disprove", guesserSeat: 0, disproverSeat: 1, card: W2! },
    ]);
    expect(next.turn).toEqual({ currentSeat: 0, phase: "accuse_or_pass" });
  });

  it("checks players in clockwise order and stops at the first holder", () => {
    const state = makeState({
      hands: [[S0!], [W0!], [S2!]],
    });
    const next = submitGuess(state, 0, { suspect: S2!, weapon: W3!, room: R3! });

    expect(next.events.map((e) => e.type)).toEqual(["guess", "no_disproval", "disprove"]);
    expect(next.events[1]).toMatchObject({ type: "no_disproval", seat: 1 });
    expect(next.events[2]).toMatchObject({ type: "disprove", disproverSeat: 2, card: S2! });
  });

  it("records a public no_disproval for every player when nobody can disprove", () => {
    const state = makeState({
      hands: [[S0!], [S1!], [S2!]],
    });
    const next = submitGuess(state, 0, { suspect: S3!, weapon: W3!, room: R3! });

    expect(next.events.map((e) => e.type)).toEqual(["guess", "no_disproval", "no_disproval"]);
    expect(next.turn).toEqual({ currentSeat: 0, phase: "accuse_or_pass" });
  });

  it("pauses for a manual choice when a player holds multiple matching cards", () => {
    const state = makeState({
      hands: [[S0!], [W2!, R2!, S1!], [S2!]],
    });
    const next = submitGuess(state, 0, { suspect: S2!, weapon: W2!, room: R2! });

    expect(next.turn.phase).toBe("awaiting_disproval");
    expect(next.turn.pending).toEqual({
      guesserSeat: 0,
      disproverSeat: 1,
      options: [W2!, R2!],
    });
  });

  it("rejects a guess from a player who is not the current seat", () => {
    const state = makeState({ hands: [[S0!], [S1!], [S2!]] });
    expect(() => submitGuess(state, 1, { suspect: S0!, weapon: W0!, room: R0! })).toThrow(
      IllegalActionError,
    );
  });

  it("rejects an invalid card name", () => {
    const state = makeState({ hands: [[S0!], [S1!], [S2!]] });
    expect(() =>
      submitGuess(state, 0, { suspect: "Not A Suspect" as never, weapon: W0!, room: R0! }),
    ).toThrow(IllegalActionError);
  });

  it("rejects a guess once the game has finished", () => {
    const state = makeState({ hands: [[S0!], [S1!], [S2!]] });
    state.status = "finished";
    expect(() => submitGuess(state, 0, { suspect: S0!, weapon: W0!, room: R0! })).toThrow(
      IllegalActionError,
    );
  });

  it("does not mutate the input state", () => {
    const state = makeState({ hands: [[S0!], [W2!], [S2!]] });
    const before = JSON.parse(JSON.stringify(state));
    submitGuess(state, 0, { suspect: S0!, weapon: W2!, room: R2! });
    expect(state).toEqual(before);
  });
});

describe("resolveDisproval", () => {
  function pendingState(): GameState {
    const state = makeState({ hands: [[S0!], [W2!, R2!, S1!], [S2!]] });
    return submitGuess(state, 0, { suspect: S2!, weapon: W2!, room: R2! });
  }

  it("applies the chosen card and returns to accuse_or_pass", () => {
    const pending = pendingState();
    const next = resolveDisproval(pending, 1, W2!);

    expect(next.events.at(-1)).toEqual({
      index: 1,
      type: "disprove",
      guesserSeat: 0,
      disproverSeat: 1,
      card: W2!,
    });
    expect(next.turn).toEqual({ currentSeat: 0, phase: "accuse_or_pass" });
  });

  it("rejects a card that was not among the offered options", () => {
    const pending = pendingState();
    expect(() => resolveDisproval(pending, 1, S1!)).toThrow(IllegalActionError);
  });

  it("rejects resolution from a seat other than the pending disprover", () => {
    const pending = pendingState();
    expect(() => resolveDisproval(pending, 0, W2!)).toThrow(IllegalActionError);
  });

  it("rejects resolution when nothing is pending", () => {
    const state = makeState({ hands: [[S0!], [S1!], [S2!]], phase: "accuse_or_pass" });
    expect(() => resolveDisproval(state, 1, S1!)).toThrow(IllegalActionError);
  });
});

describe("accuse", () => {
  it("wins the game immediately on a correct accusation", () => {
    const state = makeState({
      hands: [[S0!], [S1!], [S2!]],
      phase: "accuse_or_pass",
    });
    const next = accuse(state, 0, SOLUTION);

    expect(next.status).toBe("finished");
    expect(next.winnerSeat).toBe(0);
    expect(next.events.at(-1)).toEqual({
      index: 1,
      type: "game_over",
      winnerSeat: 0,
      reason: "correct_accusation",
      solution: SOLUTION,
    });
  });

  it("eliminates a bot on an incorrect accusation but keeps the game going", () => {
    const state = makeState({
      hands: [[S0!], [S1!], [S2!]],
      types: ["human", "bot", "bot"],
      currentSeat: 1,
      phase: "accuse_or_pass",
    });
    const next = accuse(state, 1, { suspect: S0!, weapon: W0!, room: R0! });

    expect(next.status).toBe("in_progress");
    expect(next.players[1]!.eliminated).toBe(true);
    expect(next.turn).toEqual({ currentSeat: 2, phase: "guess" });
  });

  it("ends the game immediately, with no winner, when the human accuses incorrectly", () => {
    const state = makeState({
      hands: [[S0!], [S1!], [S2!]],
      types: ["human", "bot", "bot"],
      currentSeat: 0,
      phase: "accuse_or_pass",
    });
    const next = accuse(state, 0, { suspect: S0!, weapon: W0!, room: R0! });

    expect(next.status).toBe("finished");
    expect(next.winnerSeat).toBeNull();
    expect(next.players[0]!.eliminated).toBe(true);
    expect(next.events.at(-1)).toMatchObject({
      type: "game_over",
      winnerSeat: null,
      reason: "human_incorrect_accusation",
    });
  });

  it("ends the game with no winner once every player has accused incorrectly", () => {
    let state = makeState({
      hands: [[S0!], [S1!], [S2!]],
      types: ["bot", "bot", "bot"],
      currentSeat: 0,
      phase: "guess",
    });
    const wrong = { suspect: S3!, weapon: W3!, room: R3! };

    for (const seat of [0, 1, 2]) {
      state = submitGuess(state, seat, wrong);
      expect(state.turn).toEqual({ currentSeat: seat, phase: "accuse_or_pass" });
      state = accuse(state, seat, wrong);
      expect(state.players[seat]!.eliminated).toBe(true);
    }

    expect(state.status).toBe("finished");
    expect(state.winnerSeat).toBeNull();
    expect(state.players.every((p) => p.eliminated)).toBe(true);
    expect(state.events.at(-1)).toMatchObject({ type: "game_over", reason: "all_eliminated" });
  });

  it("rejects an accusation outside the accuse_or_pass phase", () => {
    const state = makeState({ hands: [[S0!], [S1!], [S2!]], phase: "guess" });
    expect(() => accuse(state, 0, SOLUTION)).toThrow(IllegalActionError);
  });
});

describe("pass", () => {
  it("advances the turn to the next active seat", () => {
    const state = makeState({
      hands: [[S0!], [S1!], [S2!]],
      currentSeat: 0,
      phase: "accuse_or_pass",
    });
    const next = pass(state, 0);

    expect(next.events.at(-1)).toEqual({ index: 0, type: "pass", seat: 0 });
    expect(next.turn).toEqual({ currentSeat: 1, phase: "guess" });
  });

  it("skips eliminated seats when advancing", () => {
    const state = makeState({
      hands: [[S0!], [S1!], [S2!]],
      eliminated: [false, true, false],
      currentSeat: 0,
      phase: "accuse_or_pass",
    });
    const next = pass(state, 0);
    expect(next.turn.currentSeat).toBe(2);
  });

  it("rejects a pass from a player who is not the current seat", () => {
    const state = makeState({
      hands: [[S0!], [S1!], [S2!]],
      currentSeat: 0,
      phase: "accuse_or_pass",
    });
    expect(() => pass(state, 1)).toThrow(IllegalActionError);
  });

  it("rejects a pass outside the accuse_or_pass phase", () => {
    const state = makeState({ hands: [[S0!], [S1!], [S2!]], phase: "guess" });
    expect(() => pass(state, 0)).toThrow(IllegalActionError);
  });
});
