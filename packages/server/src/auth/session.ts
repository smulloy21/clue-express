import connectPgSimpleFactory from "connect-pg-simple";
import type { RequestHandler } from "express";
import session from "express-session";
import type { Pool } from "pg";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    username?: string;
    guest?: boolean;
  }
}

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

export const SESSION_COOKIE_NAME = "clue.sid";

export function createSessionMiddleware(pool: Pool): RequestHandler {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }

  const PGStore = connectPgSimpleFactory(session);
  const store = new PGStore({ pool, tableName: "session", createTableIfMissing: false });

  return session({
    store,
    secret,
    name: SESSION_COOKIE_NAME,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SEVEN_DAYS_MS,
    },
  });
}
