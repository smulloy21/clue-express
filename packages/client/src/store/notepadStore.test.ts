import { SUSPECTS } from "@clue/engine";
import { beforeEach, describe, expect, it } from "vitest";
import { useNotepadStore } from "./notepadStore.js";

const [S0, S1] = SUSPECTS;

describe("notepadStore", () => {
  beforeEach(() => {
    useNotepadStore.getState().reset();
  });

  it("normal mode seeds manual notes from exactly the dealt hand", () => {
    useNotepadStore.getState().startNewGame(0, 3, [S0!], "normal");
    const { manualNotes } = useNotepadStore.getState();
    expect(manualNotes![S0!]!["0"]).toBe("yes");
    expect(manualNotes![S0!]!["1"]).toBe("no");
    expect(manualNotes![S0!]!["2"]).toBe("no");
    expect(manualNotes![S0!]!["envelope"]).toBe("no");
    // A card not in hand starts fully unknown — no automated help.
    expect(manualNotes![S1!]!["0"]).toBe("unknown");
    expect(manualNotes![S1!]!["envelope"]).toBe("unknown");
  });

  it("training mode leaves manual notes null (the auto-notepad needs no local state)", () => {
    useNotepadStore.getState().startNewGame(0, 3, [S0!], "training");
    expect(useNotepadStore.getState().manualNotes).toBeNull();
  });

  it("cycleCell cycles unknown -> no -> yes -> unknown, without propagating to other cells", () => {
    useNotepadStore.getState().startNewGame(0, 3, [], "normal");
    const { cycleCell } = useNotepadStore.getState();

    cycleCell(S1!, "1");
    expect(useNotepadStore.getState().manualNotes![S1!]!["1"]).toBe("no");
    // Marking one holder "no" must not touch other holders — this is a plain local toggle,
    // not the engine's recordNo, which would propagate further inferences.
    expect(useNotepadStore.getState().manualNotes![S1!]!["0"]).toBe("unknown");
    expect(useNotepadStore.getState().manualNotes![S1!]!["2"]).toBe("unknown");
    expect(useNotepadStore.getState().manualNotes![S1!]!["envelope"]).toBe("unknown");

    cycleCell(S1!, "1");
    expect(useNotepadStore.getState().manualNotes![S1!]!["1"]).toBe("yes");

    cycleCell(S1!, "1");
    expect(useNotepadStore.getState().manualNotes![S1!]!["1"]).toBe("unknown");
  });

  it("cycleCell is a no-op in training mode", () => {
    useNotepadStore.getState().startNewGame(0, 3, [S0!], "training");
    useNotepadStore.getState().cycleCell(S1!, "1");
    expect(useNotepadStore.getState().manualNotes).toBeNull();
  });

  it("continueTurn increments but clamps to maxTurns", () => {
    const { continueTurn } = useNotepadStore.getState();
    continueTurn(2);
    expect(useNotepadStore.getState().revealedTurnCount).toBe(1);
    continueTurn(2);
    expect(useNotepadStore.getState().revealedTurnCount).toBe(2);
    continueTurn(2);
    expect(useNotepadStore.getState().revealedTurnCount).toBe(2);
  });

  it("reset restores initial defaults", () => {
    useNotepadStore.getState().startNewGame(0, 3, [S0!], "normal");
    useNotepadStore.getState().continueTurn(5);
    useNotepadStore.getState().reset();
    const state = useNotepadStore.getState();
    expect(state.mode).toBe("training");
    expect(state.manualNotes).toBeNull();
    expect(state.revealedTurnCount).toBe(0);
  });
});
