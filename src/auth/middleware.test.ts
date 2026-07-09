import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { requireAuth } from "./middleware.js";
import { signToken } from "./token.js";

const secret = "test-secret";

describe("requireAuth middleware", () => {
  let app: express.Express;

  beforeEach(() => {
    process.env.AUTH_SECRET = secret;
    app = express();
    app.get("/protected", requireAuth, (req, res) => {
      res.json({ ok: true });
    });
  });

  it("rejects requests with no Authorization header", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
  });

  it("rejects a malformed Authorization header", async () => {
    const res = await request(app).get("/protected").set("Authorization", "not-bearer");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });

  it("allows a valid token", async () => {
    const token = signToken({ phone: "9990000000" }, secret, 3600);
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
