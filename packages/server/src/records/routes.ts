import { Router } from "express";
import type { GameRecordRepository } from "../repositories/gameRecordRepository.js";

export function createRecordsRouter(gameRecordRepository: GameRecordRepository): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "unauthenticated" });
        return;
      }
      const records = await gameRecordRepository.findByUserId(req.session.userId);
      res.status(200).json({ records });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
