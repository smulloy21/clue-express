import type { GameDocument } from "../repositories/gameDocument.js";
import type { GameCollection } from "../repositories/gameRepository.js";

export function createFakeGameCollection(initial: GameDocument[] = []): GameCollection {
  const docs = new Map(initial.map((d) => [d._id, d]));
  return {
    findOne: async (filter) => docs.get(filter._id) ?? null,
    replaceOne: async (filter, doc) => {
      docs.set(filter._id, doc);
      return { acknowledged: true };
    },
    updateMany: async (filter, update) => {
      let matched = 0;
      for (const doc of docs.values()) {
        if (doc.ownerSessionId === filter.ownerSessionId && doc.status === filter.status) {
          Object.assign(doc, update.$set);
          matched++;
        }
      }
      return { acknowledged: true, matchedCount: matched };
    },
  };
}
