import { beforeEach, describe, expect, it } from "vitest";
import { BOT_NICKNAME_POOL } from "../game/botNames.js";
import { useBotNameStore } from "./botNameStore.js";

describe("botNameStore", () => {
  beforeEach(() => {
    useBotNameStore.getState().reset();
  });

  it("starts with no nicknames assigned", () => {
    expect(useBotNameStore.getState().nicknames).toEqual({});
  });

  it("assigns a distinct nickname to each given bot seat", () => {
    useBotNameStore.getState().assignNicknames([0, 2]);
    const { nicknames } = useBotNameStore.getState();

    expect(Object.keys(nicknames)).toEqual(["0", "2"]);
    expect(BOT_NICKNAME_POOL).toContain(nicknames[0]);
    expect(BOT_NICKNAME_POOL).toContain(nicknames[2]);
    expect(nicknames[0]).not.toBe(nicknames[2]);
  });

  it("replaces any previous assignment on a new call", () => {
    useBotNameStore.getState().assignNicknames([0, 1]);
    const first = useBotNameStore.getState().nicknames;

    useBotNameStore.getState().assignNicknames([2]);
    const second = useBotNameStore.getState().nicknames;

    expect(second[0]).toBeUndefined();
    expect(second[1]).toBeUndefined();
    expect(second[2]).toBeDefined();
    expect(first).not.toBe(second);
  });

  it("reset clears all assignments", () => {
    useBotNameStore.getState().assignNicknames([0, 2]);
    useBotNameStore.getState().reset();
    expect(useBotNameStore.getState().nicknames).toEqual({});
  });
});
