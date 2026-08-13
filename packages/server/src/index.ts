import { createApp } from "./app.js";
import { createSessionMiddleware } from "./auth/session.js";
import { getDb } from "./db/mongo.js";
import { getPool } from "./db/postgres.js";
import { createGameRecordRepository } from "./repositories/gameRecordRepository.js";
import {
  createGameRepository,
  ensureGameIndexes,
  getGamesCollection,
} from "./repositories/gameRepository.js";
import { createUserRepository } from "./repositories/userRepository.js";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const pool = getPool();
const db = await getDb();
await ensureGameIndexes(db);

const app = createApp({
  sessionMiddleware: createSessionMiddleware(pool),
  userRepository: createUserRepository(pool),
  gameRepository: createGameRepository(getGamesCollection(db)),
  gameRecordRepository: createGameRecordRepository(pool),
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
