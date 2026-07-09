import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { rateLimit } from "./rateLimit.js";

describe("rateLimit middleware", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(rateLimit({ windowMs: 1000, max: 2 }));
    app.get("/ping", (_req, res) => res.json({ ok: true }));
  });

  it("allows requests up to the limit", async () => {
    const r1 = await request(app).get("/ping");
    const r2 = await request(app).get("/ping");
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
  });

  it("rejects requests beyond the limit within the window", async () => {
    await request(app).get("/ping");
    await request(app).get("/ping");
    const r3 = await request(app).get("/ping");
    expect(r3.status).toBe(429);
  });

  it("resets after the window elapses", async () => {
    await request(app).get("/ping");
    await request(app).get("/ping");
    await new Promise((r) => setTimeout(r, 1100));
    const r3 = await request(app).get("/ping");
    expect(r3.status).toBe(200);
  });

  it("tracks separate keys independently", async () => {
    app = express();
    app.use(
      rateLimit({
        windowMs: 1000,
        max: 1,
        keyFn: (req) => String(req.query.who ?? "anon"),
      }),
    );
    app.get("/ping", (_req, res) => res.json({ ok: true }));
    const a1 = await request(app).get("/ping?who=alice");
    const b1 = await request(app).get("/ping?who=bob");
    const a2 = await request(app).get("/ping?who=alice");
    expect(a1.status).toBe(200);
    expect(b1.status).toBe(200);
    expect(a2.status).toBe(429);
  });
});
