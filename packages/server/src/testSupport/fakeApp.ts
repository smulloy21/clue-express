import session from "express-session";
import { randomUUID } from "node:crypto";
import { createApp } from "../app.js";
import {
  DuplicateUsernameError,
  type UserRecord,
  type UserRepository,
} from "../repositories/userRepository.js";

export function createFakeUserRepository(): UserRepository {
  const usersByUsername = new Map<string, UserRecord>();

  return {
    async findByUsername(username) {
      return usersByUsername.get(username) ?? null;
    },
    async create(username, passwordHash) {
      if (usersByUsername.has(username)) {
        throw new DuplicateUsernameError(username);
      }
      const user: UserRecord = { id: randomUUID(), username, passwordHash, createdAt: new Date() };
      usersByUsername.set(username, user);
      return user;
    },
  };
}

/** express-session with no `store` falls back to its in-memory MemoryStore — fine for tests. */
export function createTestApp() {
  const userRepository = createFakeUserRepository();
  const app = createApp({
    sessionMiddleware: session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax", secure: false },
    }),
    userRepository,
  });
  return { app, userRepository };
}
