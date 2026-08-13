import type { Collection, Db } from "mongodb";
import type { GameDocument } from "./gameDocument.js";

const COLLECTION_NAME = "games";

export function getGamesCollection(db: Db): Collection<GameDocument> {
  return db.collection<GameDocument>(COLLECTION_NAME);
}

/** Indexes supporting the v1 "abandon any in-progress game on login" flow and per-user lookups. */
export async function ensureGameIndexes(db: Db): Promise<void> {
  await getGamesCollection(db).createIndex({ userId: 1, status: 1 });
}

/** The subset of the MongoDB driver's Collection API the repository needs — kept narrow for testability. */
export interface GameCollection {
  findOne(filter: { _id: string }): Promise<GameDocument | null>;
  replaceOne(
    filter: { _id: string },
    doc: GameDocument,
    options: { upsert: true },
  ): Promise<unknown>;
}

export interface GameRepository {
  load(gameId: string): Promise<GameDocument | null>;
  save(doc: GameDocument): Promise<GameDocument>;
  /** Loads the game, applies a pure mutation, and persists the result — throws if the game doesn't exist. */
  applyAction(gameId: string, mutate: (doc: GameDocument) => GameDocument): Promise<GameDocument>;
}

export function createGameRepository(collection: GameCollection): GameRepository {
  async function save(doc: GameDocument): Promise<GameDocument> {
    const next: GameDocument = { ...doc, updatedAt: new Date() };
    await collection.replaceOne({ _id: next._id }, next, { upsert: true });
    return next;
  }

  return {
    load: (gameId) => collection.findOne({ _id: gameId }),
    save,
    async applyAction(gameId, mutate) {
      const doc = await collection.findOne({ _id: gameId });
      if (!doc) {
        throw new Error(`no game found for id "${gameId}"`);
      }
      return save(mutate(doc));
    },
  };
}
