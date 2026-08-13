import { describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "../testSupport/fakeApp.js";

const credentials = { username: "alice", password: "correct-horse-battery" };

describe("POST /api/auth/signup", () => {
  it("creates a user and starts an authenticated session", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);

    const res = await agent.post("/api/auth/signup").send(credentials);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ username: "alice" });
    expect(res.body.id).toBeTypeOf("string");
    expect(res.body.password).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();

    const me = await agent.get("/api/auth/me");
    expect(me.body).toEqual({
      authenticated: true,
      guest: false,
      id: res.body.id,
      username: "alice",
    });
  });

  it("rejects a duplicate username", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send(credentials);

    const res = await request(app).post("/api/auth/signup").send(credentials);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "username_taken" });
  });

  it("rejects an invalid username", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "a", password: "correct-horse-battery" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation");
  });

  it("rejects a short password", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "bob", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation");
  });

  it("never stores or returns the plaintext password", async () => {
    const { app, userRepository } = createTestApp();
    await request(app).post("/api/auth/signup").send(credentials);

    const stored = await userRepository.findByUsername("alice");
    expect(stored?.passwordHash).not.toBe(credentials.password);
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and starts a session", async () => {
    const { app } = createTestApp();
    await request(app).post("/api/auth/signup").send(credentials);

    const agent = request.agent(app);
    const res = await agent.post("/api/auth/login").send(credentials);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: "alice" });

    const me = await agent.get("/api/auth/me");
    expect(me.body).toMatchObject({ authenticated: true, guest: false, username: "alice" });
  });

  it("rejects an unknown username", async () => {
    const { app } = createTestApp();
    const res = await request(app).post("/api/auth/login").send(credentials);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "invalid_credentials" });
  });

  it("rejects an incorrect password", async () => {
    const { app } = createTestApp();
    await request(app).post("/api/auth/signup").send(credentials);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "alice", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "invalid_credentials" });
  });
});

describe("POST /api/auth/guest", () => {
  it("starts a guest session without creating a user", async () => {
    const { app, userRepository } = createTestApp();
    const agent = request.agent(app);

    const res = await agent.post("/api/auth/guest");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ guest: true });

    const me = await agent.get("/api/auth/me");
    expect(me.body).toEqual({ authenticated: true, guest: true });

    expect(await userRepository.findByUsername("guest")).toBeNull();
  });
});

describe("GET /api/auth/me", () => {
  it("reports unauthenticated when there is no session", async () => {
    const { app } = createTestApp();
    const res = await request(app).get("/api/auth/me");
    expect(res.body).toEqual({ authenticated: false });
  });
});

describe("POST /api/auth/logout", () => {
  it("ends the session so /me reports unauthenticated afterward", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send(credentials);

    const logoutRes = await agent.post("/api/auth/logout");
    expect(logoutRes.status).toBe(204);

    const me = await agent.get("/api/auth/me");
    expect(me.body).toEqual({ authenticated: false });
  });

  it("logs out a guest session too", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");

    await agent.post("/api/auth/logout");

    const me = await agent.get("/api/auth/me");
    expect(me.body).toEqual({ authenticated: false });
  });
});

describe("session isolation", () => {
  it("does not share auth state between two independent clients", async () => {
    const { app } = createTestApp();
    await request(app).post("/api/auth/signup").send(credentials);

    const res = await request(app).get("/api/auth/me");
    expect(res.body).toEqual({ authenticated: false });
  });
});
