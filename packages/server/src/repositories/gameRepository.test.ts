import { describe, expect, it } from "vitest";
import { createFakeGameCollection as fakeCollection } from "../testSupport/fakeGameCollection.js";
import type { GameDocument } from "./gameDocument.js";
import { createGameRepository } from "./gameRepository.js";

function makeDoc(overrides: Partial<GameDocument> = {}): GameDocument {
  return {
    _id: "game-1",
    userId: null,
    ownerSessionId: "session-1",
    status: "in_progress",
    seed: 1,
    solution: { suspect: "Miss Scarlet", weapon: "Candlestick", room: "Kitchen" },
    players: [],
    turn: { currentSeat: 0, phase: "guess" },
    winnerSeat: null,
    events: [],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("createGameRepository", () => {
  describe("load", () => {
    it("returns null when the game doesn't exist", async () => {
      const repo = createGameRepository(fakeCollection());
      expect(await repo.load("missing")).toBeNull();
    });

    it("returns the stored document", async () => {
      const doc = makeDoc();
      const repo = createGameRepository(fakeCollection([doc]));
      expect(await repo.load("game-1")).toEqual(doc);
    });
  });

  describe("save", () => {
    it("upserts a new document", async () => {
      const collection = fakeCollection();
      const repo = createGameRepository(collection);
      const doc = makeDoc();

      await repo.save(doc);

      expect(await repo.load("game-1")).toMatchObject({ _id: "game-1", seed: 1 });
    });

    it("stamps updatedAt on every save", async () => {
      const doc = makeDoc();
      const repo = createGameRepository(fakeCollection());

      const saved = await repo.save(doc);

      expect(saved.updatedAt.getTime()).toBeGreaterThan(doc.updatedAt.getTime());
    });

    it("overwrites an existing document with the same id", async () => {
      const original = makeDoc({ status: "in_progress" });
      const repo = createGameRepository(fakeCollection([original]));

      await repo.save(makeDoc({ status: "finished" }));

      expect((await repo.load("game-1"))?.status).toBe("finished");
    });
  });

  describe("applyAction", () => {
    it("loads, applies the mutation, and persists the result", async () => {
      const doc = makeDoc({ seed: 1 });
      const repo = createGameRepository(fakeCollection([doc]));

      const result = await repo.applyAction("game-1", (current) => ({
        ...current,
        seed: current.seed + 1,
      }));

      expect(result.seed).toBe(2);
      expect((await repo.load("game-1"))?.seed).toBe(2);
    });

    it("stamps updatedAt after applying the mutation", async () => {
      const doc = makeDoc();
      const repo = createGameRepository(fakeCollection([doc]));

      const result = await repo.applyAction("game-1", (current) => current);

      expect(result.updatedAt.getTime()).toBeGreaterThan(doc.updatedAt.getTime());
    });

    it("throws when the game doesn't exist", async () => {
      const repo = createGameRepository(fakeCollection());
      await expect(repo.applyAction("missing", (current) => current)).rejects.toThrow(
        /no game found/,
      );
    });
  });

  describe("abandonInProgressGamesForSession", () => {
    it("marks only that session's in-progress games as abandoned", async () => {
      const mine = makeDoc({ _id: "mine", ownerSessionId: "session-1", status: "in_progress" });
      const someoneElses = makeDoc({
        _id: "theirs",
        ownerSessionId: "session-2",
        status: "in_progress",
      });
      const alreadyFinished = makeDoc({
        _id: "old",
        ownerSessionId: "session-1",
        status: "finished",
      });
      const repo = createGameRepository(fakeCollection([mine, someoneElses, alreadyFinished]));

      await repo.abandonInProgressGamesForSession("session-1");

      expect((await repo.load("mine"))?.status).toBe("abandoned");
      expect((await repo.load("theirs"))?.status).toBe("in_progress");
      expect((await repo.load("old"))?.status).toBe("finished");
    });
  });
});
