import express, { type Express, type RequestHandler } from "express";
import { createAuthRouter } from "./auth/routes.js";
import type { UserRepository } from "./repositories/userRepository.js";

export interface AppDependencies {
  sessionMiddleware: RequestHandler;
  userRepository: UserRepository;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(express.json());
  app.use(deps.sessionMiddleware);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", createAuthRouter(deps.userRepository));

  return app;
}
