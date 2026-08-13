import { Router, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import type { UserRepository } from "../repositories/userRepository.js";
import { DuplicateUsernameError } from "../repositories/userRepository.js";
import { hashPassword, verifyPassword } from "./passwordHashing.js";
import { SESSION_COOKIE_NAME } from "./session.js";
import { credentialsSchema } from "./validation.js";

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
});

export function createAuthRouter(userRepository: UserRepository): Router {
  const router = Router();
  router.use(authRateLimit);

  router.post("/signup", async (req, res, next) => {
    try {
      const result = credentialsSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: "validation", issues: result.error.issues });
        return;
      }
      const { username, password } = result.data;

      const passwordHash = await hashPassword(password);
      let user;
      try {
        user = await userRepository.create(username, passwordHash);
      } catch (error) {
        if (error instanceof DuplicateUsernameError) {
          res.status(409).json({ error: "username_taken" });
          return;
        }
        throw error;
      }

      await regenerateSession(req);
      req.session.userId = user.id;
      req.session.username = user.username;

      res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const result = credentialsSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: "validation", issues: result.error.issues });
        return;
      }
      const { username, password } = result.data;

      const user = await userRepository.findByUsername(username);
      if (!user || !(await verifyPassword(user.passwordHash, password))) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }

      await regenerateSession(req);
      req.session.userId = user.id;
      req.session.username = user.username;

      res.status(200).json({ id: user.id, username: user.username });
    } catch (error) {
      next(error);
    }
  });

  router.post("/guest", async (req, res, next) => {
    try {
      await regenerateSession(req);
      req.session.guest = true;

      res.status(200).json({ guest: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", async (req, res, next) => {
    try {
      await destroySession(req);
      res.clearCookie(SESSION_COOKIE_NAME);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", (req, res) => {
    if (req.session.userId && req.session.username) {
      res.status(200).json({
        authenticated: true,
        guest: false,
        id: req.session.userId,
        username: req.session.username,
      });
      return;
    }
    if (req.session.guest) {
      res.status(200).json({ authenticated: true, guest: true });
      return;
    }
    res.status(200).json({ authenticated: false });
  });

  return router;
}
