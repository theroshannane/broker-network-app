import { beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { resetDb, closePool } from "../test/setup.js";
import { authHeader } from "../test/authHeader.js";
import { app } from "./app.js";

beforeEach(resetDb);
afterAll(closePool);

describe("api", () => {
  it("POST /brokers creates a broker", async () => {
    const res = await request(app)
      .post("/brokers")
      .set(...authHeader())
      .send({ phone: "9991112222", name: "Neha", reraId: "R-9" });
    expect(res.status).toBe(201);
    expect(res.body.verification).toBe("verified");
  });

  it("400 on invalid broker payload", async () => {
    const res = await request(app)
      .post("/brokers")
      .set(...authHeader())
      .send({ name: "NoPhone" });
    expect(res.status).toBe(400);
  });

  it("401 without auth token", async () => {
    const res = await request(app).post("/brokers").send({ phone: "9991112222", name: "Neha" });
    expect(res.status).toBe(401);
  });

  it("POST /listings then GET /listings finds it", async () => {
    const broker = await request(app)
      .post("/brokers")
      .set(...authHeader())
      .send({ phone: "9993334444", name: "Amit", reraId: "R-1" });
    await request(app)
      .post("/listings")
      .set(...authHeader())
      .send({
        brokerId: broker.body.id, txn: "rent",
        locality: "Vashi", pincode: "400703", budget: 40000,
      });
    const res = await request(app).get("/listings?locality=Vashi");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.headers["x-total-count"]).toBe("1");
  });

  it("GET /listings paginates with limit and offset", async () => {
    const broker = await request(app)
      .post("/brokers")
      .set(...authHeader())
      .send({ phone: "9993335555", name: "Priya", reraId: "R-2" });
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post("/listings")
        .set(...authHeader())
        .send({
          brokerId: broker.body.id, txn: "rent",
          locality: "Chembur", pincode: "400071", budget: 30000 + i,
        });
    }
    const res = await request(app).get("/listings?locality=Chembur&limit=2&offset=1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.headers["x-total-count"]).toBe("3");
  });
});
