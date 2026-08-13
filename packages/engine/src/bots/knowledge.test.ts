import { describe, expect, it } from "vitest";
import { ROOMS, SUSPECTS, WEAPONS } from "../constants.js";
import {
  createKnowledge,
  getBelief,
  getKnownSolution,
  isConfirmed,
  recordDisjunction,
  recordNo,
  recordYes,
  unconfirmedCardsInCategory,
} from "./knowledge.js";

const [S0, S1, S2, S3, S4, S5] = SUSPECTS;
const [W0, W1, W2, W3, W4, W5] = WEAPONS;
const [R0, R1, R2, R3, R4, R5, R6, R7, R8] = ROOMS;

describe("createKnowledge", () => {
  it("marks own-hand cards yes for self and no for everyone else", () => {
    const state = createKnowledge(0, 3, [S0!, W0!]);
    expect(getBelief(state, S0!, 0)).toBe("yes");
    expect(getBelief(state, S0!, 1)).toBe("no");
    expect(getBelief(state, S0!, 2)).toBe("no");
    expect(getBelief(state, S0!, "envelope")).toBe("no");
  });

  it("leaves cards outside the hand unknown", () => {
    const state = createKnowledge(0, 3, [S0!]);
    expect(getBelief(state, S1!, 0)).toBe("unknown");
    expect(getBelief(state, S1!, 1)).toBe("unknown");
    expect(getBelief(state, S1!, "envelope")).toBe("unknown");
  });
});

describe("recordYes", () => {
  it("sets every other holder to no for that card", () => {
    let state = createKnowledge(0, 3, []);
    state = recordYes(state, S0!, 1);
    expect(getBelief(state, S0!, 0)).toBe("no");
    expect(getBelief(state, S0!, 1)).toBe("yes");
    expect(getBelief(state, S0!, 2)).toBe("no");
    expect(getBelief(state, S0!, "envelope")).toBe("no");
  });
});

describe("recordNo — exactly one holder per card", () => {
  it("promotes the last non-no holder to yes once the other three are ruled out", () => {
    let state = createKnowledge(0, 3, []);
    state = recordNo(state, S0!, 0);
    state = recordNo(state, S0!, 1);
    expect(getBelief(state, S0!, 2)).toBe("unknown");
    expect(getBelief(state, S0!, "envelope")).toBe("unknown");
    state = recordNo(state, S0!, "envelope");
    expect(getBelief(state, S0!, 2)).toBe("yes");
  });
});

describe("propagation — a player with 6 confirmed cards gets no on everything else", () => {
  it("marks the remaining unknown cards no for that player once their 6th card is confirmed", () => {
    let state = createKnowledge(0, 3, [S0!, S1!, W0!, W1!, R0!, R1!]);
    const shownToHolder1 = [S2!, S3!, W2!, W3!, R2!, R3!];
    for (const card of shownToHolder1) {
      state = recordYes(state, card, 1);
    }
    const untouched = [S4!, S5!, W4!, W5!, R4!, R5!, R6!, R7!, R8!];
    for (const card of untouched) {
      expect(getBelief(state, card, 1)).toBe("no");
    }
  });
});

describe("propagation — envelope category elimination", () => {
  it("deduces the envelope's card once all others in the category are ruled out", () => {
    let state = createKnowledge(0, 3, []);
    for (const suspect of [S0!, S1!, S2!, S3!, S4!]) {
      state = recordNo(state, suspect, "envelope");
    }
    expect(getBelief(state, S5!, "envelope")).toBe("yes");
    // and that cascades: no player can hold the solution's suspect card.
    expect(getBelief(state, S5!, 0)).toBe("no");
    expect(getBelief(state, S5!, 1)).toBe("no");
    expect(getBelief(state, S5!, 2)).toBe("no");
  });

  it("rules out the rest of the category once the envelope's card is confirmed", () => {
    let state = createKnowledge(0, 3, []);
    state = recordYes(state, W0!, "envelope");
    for (const weapon of [W1!, W2!, W3!, W4!, W5!]) {
      expect(getBelief(state, weapon, "envelope")).toBe("no");
    }
  });
});

describe("getKnownSolution", () => {
  it("is null until all three categories are determined", () => {
    let state = createKnowledge(0, 3, []);
    expect(getKnownSolution(state)).toBeNull();
    state = recordYes(state, S0!, "envelope");
    expect(getKnownSolution(state)).toBeNull();
    state = recordYes(state, W0!, "envelope");
    expect(getKnownSolution(state)).toBeNull();
  });

  it("returns the full solution once determined", () => {
    let state = createKnowledge(0, 3, []);
    state = recordYes(state, S0!, "envelope");
    state = recordYes(state, W0!, "envelope");
    state = recordYes(state, R0!, "envelope");
    expect(getKnownSolution(state)).toEqual({ suspect: S0!, weapon: W0!, room: R0! });
  });
});

describe("recordDisjunction", () => {
  it("does not resolve while more than one candidate remains", () => {
    let state = createKnowledge(0, 3, []);
    state = recordDisjunction(state, 1, [S0!, S1!, S2!]);
    expect(getBelief(state, S0!, 1)).toBe("unknown");
    expect(getBelief(state, S1!, 1)).toBe("unknown");
    expect(getBelief(state, S2!, 1)).toBe("unknown");
  });

  it("resolves to the last remaining candidate once the others are ruled out", () => {
    let state = createKnowledge(0, 3, []);
    state = recordDisjunction(state, 1, [S0!, S1!, S2!]);
    state = recordNo(state, S0!, 1);
    expect(getBelief(state, S2!, 1)).toBe("unknown");
    state = recordNo(state, S1!, 1);
    expect(getBelief(state, S2!, 1)).toBe("yes");
  });

  it("resolves immediately when only one candidate is not already ruled out", () => {
    let state = createKnowledge(0, 3, []);
    state = recordNo(state, S0!, 1);
    state = recordNo(state, S1!, 1);
    state = recordDisjunction(state, 1, [S0!, S1!, S2!]);
    expect(getBelief(state, S2!, 1)).toBe("yes");
  });

  it("is a no-op when the holder is already confirmed for one of the candidates", () => {
    let state = createKnowledge(0, 3, []);
    state = recordYes(state, S0!, 1);
    const before = state;
    state = recordDisjunction(state, 1, [S0!, S1!, S2!]);
    expect(state).toEqual(before);
  });
});

describe("isConfirmed / unconfirmedCardsInCategory", () => {
  it("treats a card as confirmed once any holder is known", () => {
    let state = createKnowledge(0, 3, [S0!]);
    expect(isConfirmed(state, S0!)).toBe(true);
    expect(isConfirmed(state, S1!)).toBe(false);
    state = recordYes(state, S1!, 1);
    expect(isConfirmed(state, S1!)).toBe(true);
  });

  it("lists only cards with no confirmed holder", () => {
    let state = createKnowledge(0, 3, [S0!]);
    state = recordYes(state, S1!, 1);
    const unconfirmed = unconfirmedCardsInCategory(state, "suspect");
    expect(unconfirmed).not.toContain(S0!);
    expect(unconfirmed).not.toContain(S1!);
    expect(unconfirmed).toEqual(expect.arrayContaining([S2!, S3!, S4!, S5!]));
  });
});
