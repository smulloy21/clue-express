import { describe, expect, it } from "vitest";
import { ROOMS, SUSPECTS, WEAPONS } from "../constants.js";
import type { Rng } from "../rng.js";
import {
  createBotAgent,
  decideAccusation,
  decideDisproval,
  decideGuess,
  observeEvent,
} from "./agent.js";
import { getBelief, recordNo, recordYes } from "./knowledge.js";

const [S0, S1, S2, S3, S4, S5] = SUSPECTS;
const [W0, W1, , , , W5] = WEAPONS;
const [R0, , , , , , , , R8] = ROOMS;

function fakeRng(values: readonly number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe("observeEvent — no_disproval", () => {
  const guess = {
    index: 0,
    type: "guess" as const,
    seat: 1,
    guess: { suspect: S1!, weapon: W0!, room: R0! },
  };
  const noDisproval = { index: 1, type: "no_disproval" as const, seat: 2 };

  it("hard bot marks all three guessed cards no for the seat that failed to disprove", () => {
    let agent = createBotAgent(0, "hard", [S0!], 3, fakeRng([0]));
    agent = observeEvent(agent, guess);
    agent = observeEvent(agent, noDisproval);
    expect(getBelief(agent.knowledge, S1!, 2)).toBe("no");
    expect(getBelief(agent.knowledge, W0!, 2)).toBe("no");
    expect(getBelief(agent.knowledge, R0!, 2)).toBe("no");
  });

  it("easy bot ignores no_disproval events entirely", () => {
    let agent = createBotAgent(0, "easy", [S0!], 3, fakeRng([0]));
    agent = observeEvent(agent, guess);
    agent = observeEvent(agent, noDisproval);
    expect(getBelief(agent.knowledge, S1!, 2)).toBe("unknown");
    expect(getBelief(agent.knowledge, W0!, 2)).toBe("unknown");
    expect(getBelief(agent.knowledge, R0!, 2)).toBe("unknown");
  });
});

describe("observeEvent — disprove", () => {
  const guess = {
    index: 0,
    type: "guess" as const,
    seat: 1,
    guess: { suspect: S1!, weapon: W0!, room: R0! },
  };

  it("records the card as held by the disprover when it is shown to this bot (as guesser)", () => {
    let agent = createBotAgent(1, "easy", [S1!], 3, fakeRng([0]));
    agent = observeEvent(agent, guess);
    agent = observeEvent(agent, {
      index: 1,
      type: "disprove",
      guesserSeat: 1,
      disproverSeat: 2,
      card: W0!,
    });
    expect(getBelief(agent.knowledge, W0!, 2)).toBe("yes");
  });

  it("hard bot builds a disjunction from a disprove it can't see, resolved once two candidates are ruled out", () => {
    let agent = createBotAgent(0, "hard", [S0!], 3, fakeRng([0]));
    agent = observeEvent(agent, guess);
    agent = observeEvent(agent, { index: 1, type: "disprove", guesserSeat: 1, disproverSeat: 2 });

    // Not yet resolved: nothing ruled out.
    expect(getBelief(agent.knowledge, S1!, 2)).toBe("unknown");

    agent = { ...agent, knowledge: recordNo(agent.knowledge, S1!, 2) };
    expect(getBelief(agent.knowledge, R0!, 2)).toBe("unknown");

    agent = { ...agent, knowledge: recordNo(agent.knowledge, W0!, 2) };
    expect(getBelief(agent.knowledge, R0!, 2)).toBe("yes");
  });

  it("easy bot never records a disjunction from an unseen disprove", () => {
    let agent = createBotAgent(0, "easy", [S0!], 3, fakeRng([0]));
    agent = observeEvent(agent, guess);
    agent = observeEvent(agent, { index: 1, type: "disprove", guesserSeat: 1, disproverSeat: 2 });

    agent = { ...agent, knowledge: recordNo(agent.knowledge, S1!, 2) };
    agent = { ...agent, knowledge: recordNo(agent.knowledge, W0!, 2) };
    expect(getBelief(agent.knowledge, R0!, 2)).toBe("unknown");
  });
});

describe("decideAccusation", () => {
  it("passes (returns null) until the envelope is fully determined", () => {
    let agent = createBotAgent(0, "hard", [S0!], 3, fakeRng([0]));
    expect(decideAccusation(agent)).toBeNull();
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S5!, "envelope") };
    expect(decideAccusation(agent)).toBeNull();
    agent = { ...agent, knowledge: recordYes(agent.knowledge, W5!, "envelope") };
    expect(decideAccusation(agent)).toBeNull();
  });

  it("accuses with the known solution once fully determined", () => {
    let agent = createBotAgent(0, "hard", [S0!], 3, fakeRng([0]));
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S5!, "envelope") };
    agent = { ...agent, knowledge: recordYes(agent.knowledge, W5!, "envelope") };
    agent = { ...agent, knowledge: recordYes(agent.knowledge, R8!, "envelope") };
    expect(decideAccusation(agent)).toEqual({ suspect: S5!, weapon: W5!, room: R8! });
  });
});

describe("decideDisproval", () => {
  it("picks one of the offered options", () => {
    const agent = createBotAgent(1, "easy", [S1!, W1!], 3, fakeRng([0.99]));
    const chosen = decideDisproval(agent, [S1!, W1!]);
    expect([S1!, W1!]).toContain(chosen);
  });
});

describe("decideGuess", () => {
  it("hard bot prefers a card whose holder is unconfirmed", () => {
    let agent = createBotAgent(0, "hard", [S0!], 3, fakeRng([0]));
    // S0 is confirmed via own hand. Confirm S2, S3 and S5, leaving S1 and S4 unconfirmed
    // (confirming all-but-one would let elimination solve the last one, which we want to avoid here).
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S2!, 1) };
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S3!, 1) };
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S5!, 2) };

    const guess = decideGuess(agent);
    expect([S1!, S4!]).toContain(guess.suspect);
  });

  it("hard bot uses an own-hand card once a category is fully solved", () => {
    let agent = createBotAgent(0, "hard", [S0!], 3, fakeRng([0]));
    // S0 is confirmed via own hand; confirm every other suspect's holder too.
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S1!, 1) };
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S2!, 1) };
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S3!, 2) };
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S4!, 2) };
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S5!, "envelope") };

    const guess = decideGuess(agent);
    expect(guess.suspect).toBe(S0!);
  });

  it("easy bot avoids already-confirmed cards when not bluffing", () => {
    let agent = createBotAgent(0, "easy", [S0!], 3, fakeRng([0.99, 0]));
    agent = { ...agent, knowledge: recordYes(agent.knowledge, S1!, 1) };
    const guess = decideGuess(agent);
    expect(guess.suspect).not.toBe(S0!);
    expect(guess.suspect).not.toBe(S1!);
  });

  it("easy bot occasionally bluffs with one of its own cards", () => {
    const agent = createBotAgent(0, "easy", [S0!], 3, fakeRng([0]), { bluffProbability: 1 });
    const guess = decideGuess(agent);
    expect(guess.suspect).toBe(S0!);
  });
});
