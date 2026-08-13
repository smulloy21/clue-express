import { randomUUID } from "node:crypto";
import type { GameRecord, GameRecordRepository } from "../repositories/gameRecordRepository.js";

export function createFakeGameRecordRepository(): GameRecordRepository {
  const records: GameRecord[] = [];
  return {
    async create(input) {
      const record: GameRecord = { id: randomUUID(), finishedAt: new Date(), ...input };
      records.push(record);
      return record;
    },
    async findByUserId(userId) {
      return records
        .filter((r) => r.userId === userId)
        .sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());
    },
  };
}
