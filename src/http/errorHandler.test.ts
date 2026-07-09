import { describe, it, expect, vi, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { errorHandler } from "./errorHandler.js";

describe("errorHandler middleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 500 with a generic message for thrown errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const app = express();
    app.get("/boom", () => {
      throw new Error("something exploded with a secret detail");
    });
    app.use(errorHandler);

    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal server error" });
    expect(res.text).not.toContain("secret detail");
  });

  it("returns 500 for rejected async handlers", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const app = express();
    app.get("/async-boom", async () => {
      throw new Error("async failure");
    });
    app.use(errorHandler);

    const res = await request(app).get("/async-boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal server error" });
  });

  it("logs the error server-side", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = express();
    app.get("/boom", () => {
      throw new Error("logged error");
    });
    app.use(errorHandler);

    await request(app).get("/boom");
    expect(spy).toHaveBeenCalled();
  });

  it("does nothing if headers were already sent", () => {
    const next = vi.fn();
    const res = {
      headersSent: true,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as express.Response;
    errorHandler(new Error("late"), {} as express.Request, res, next);
    expect(res.status).not.toHaveBeenCalled();
  });
});
