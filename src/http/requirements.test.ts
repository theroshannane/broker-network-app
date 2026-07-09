import { beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { resetDb, closePool } from "../test/setup.js";
import { app } from "./app.js";

beforeEach(resetDb);
afterAll(closePool);

async function makeBroker(phone: string) {
  const res = await request(app).post("/brokers").send({ phone, name: "B", reraId: "R" });
  return res.body;
}

describe("requirements + alerts api", () => {
  it("POST /requirements creates a requirement", async () => {
    const b = await makeBroker("9992220001");
    const res = await request(app).post("/requirements").send({
      brokerId: b.id, txn: "rent", locality: "Andheri West", maxBudget: 50000,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it("400 on invalid requirement payload", async () => {
    const res = await request(app).post("/requirements").send({ txn: "rent" });
    expect(res.status).toBe(400);
  });

  it("GET /brokers/:id/alerts returns alerts after a matching listing is posted", async () => {
    const seeker = await makeBroker("9992220002");
    const owner = await makeBroker("9992220003");
    await request(app).post("/requirements").send({
      brokerId: seeker.id, txn: "rent", locality: "Andheri West", maxBudget: 50000,
    });
    await request(app).post("/listings").send({
      brokerId: owner.id, txn: "rent", locality: "Andheri West", pincode: "400058", budget: 45000,
    });
    const res = await request(app).get(`/brokers/${seeker.id}/alerts`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].listing.locality).toBe("Andheri West");
  });
});
