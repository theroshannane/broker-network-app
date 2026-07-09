import { beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { resetDb, closePool } from "../test/setup.js";
import { authHeader } from "../test/authHeader.js";
import { app } from "./app.js";

beforeEach(resetDb);
afterAll(closePool);

async function makeBroker(phone: string) {
  const res = await request(app)
    .post("/brokers")
    .set(...authHeader())
    .send({ phone, name: "B", reraId: "R" });
  return res.body;
}

describe("smart match api", () => {
  it("GET /requirements/:id/smart-match ranks open listings", async () => {
    const seeker = await makeBroker("9993330001");
    const owner = await makeBroker("9993330002");
    const reqRes = await request(app)
      .post("/requirements")
      .set(...authHeader())
      .send({
        brokerId: seeker.id, txn: "rent", locality: "Andheri West", maxBudget: 50000,
      });
    await request(app)
      .post("/listings")
      .set(...authHeader())
      .send({
        brokerId: owner.id, txn: "rent", locality: "Andheri West", pincode: "400058", budget: 45000,
      });
    await request(app)
      .post("/listings")
      .set(...authHeader())
      .send({
        brokerId: owner.id, txn: "sell", locality: "Bandra", pincode: "400050", budget: 9000000,
      });
    const res = await request(app).get(`/requirements/${reqRes.body.id}/smart-match`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].listing.locality).toBe("Andheri West");
    expect(res.body[0].score).toBeGreaterThan(res.body[1].score);
  });

  it("404 for unknown requirement", async () => {
    const res = await request(app).get(
      "/requirements/00000000-0000-0000-0000-000000000000/smart-match",
    );
    expect(res.status).toBe(404);
  });
});
