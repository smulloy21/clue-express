import type { BotDifficulty, PlayerType } from "@clue/engine";
import type { Queryable } from "../db/queryable.js";

export interface GameRecordParticipant {
  seat: number;
  type: PlayerType;
  difficulty?: BotDifficulty;
}

export interface CreateGameRecordInput {
  userId: string | null;
  participants: GameRecordParticipant[];
  winnerSeat: number | null;
  humanWon: boolean;
}

export interface GameRecord extends CreateGameRecordInput {
  id: string;
  finishedAt: Date;
}

interface GameRecordRow {
  id: string;
  user_id: string | null;
  participants: GameRecordParticipant[];
  winner_seat: number | null;
  human_won: boolean;
  finished_at: Date;
}

function mapRow(row: GameRecordRow): GameRecord {
  return {
    id: row.id,
    userId: row.user_id,
    participants: row.participants,
    winnerSeat: row.winner_seat,
    humanWon: row.human_won,
    finishedAt: row.finished_at,
  };
}

export interface GameRecordRepository {
  create(input: CreateGameRecordInput): Promise<GameRecord>;
  findByUserId(userId: string): Promise<GameRecord[]>;
}

export function createGameRecordRepository(db: Queryable): GameRecordRepository {
  return {
    async create({ userId, participants, winnerSeat, humanWon }) {
      const { rows } = await db.query<GameRecordRow>(
        `INSERT INTO game_records (user_id, participants, winner_seat, human_won)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, participants, winner_seat, human_won, finished_at`,
        [userId, JSON.stringify(participants), winnerSeat, humanWon],
      );
      return mapRow(rows[0]!);
    },

    async findByUserId(userId) {
      const { rows } = await db.query<GameRecordRow>(
        `SELECT id, user_id, participants, winner_seat, human_won, finished_at
         FROM game_records
         WHERE user_id = $1
         ORDER BY finished_at DESC`,
        [userId],
      );
      return rows.map(mapRow);
    },
  };
}
