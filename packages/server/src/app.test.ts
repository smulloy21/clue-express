import { describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "./testSupport/fakeApp.js";

describe("health check", () => {
  it("responds ok", async () => {
    const { app } = createTestApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
