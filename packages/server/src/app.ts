import express, { type Express, type RequestHandler } from "express";
import { createAuthRouter } from "./auth/routes.js";
import { createGameRouter } from "./games/routes.js";
import { createRecordsRouter } from "./records/routes.js";
import type { GameRecordRepository } from "./repositories/gameRecordRepository.js";
import type { GameRepository } from "./repositories/gameRepository.js";
import type { UserRepository } from "./repositories/userRepository.js";

export interface AppDependencies {
  sessionMiddleware: RequestHandler;
  userRepository: UserRepository;
  gameRepository: GameRepository;
  gameRecordRepository: GameRecordRepository;
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
  app.use(
    "/api/games",
    createGameRouter({
      gameRepository: deps.gameRepository,
      gameRecordRepository: deps.gameRecordRepository,
    }),
  );
  app.use("/api/records", createRecordsRouter(deps.gameRecordRepository));

  return app;
}
