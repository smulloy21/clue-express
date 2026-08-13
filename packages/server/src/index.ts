import { createApp } from "./app.js";
import { createSessionMiddleware } from "./auth/session.js";
import { getPool } from "./db/postgres.js";
import { createUserRepository } from "./repositories/userRepository.js";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const pool = getPool();
const app = createApp({
  sessionMiddleware: createSessionMiddleware(pool),
  userRepository: createUserRepository(pool),
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
