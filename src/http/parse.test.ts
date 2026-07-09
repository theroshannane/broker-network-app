import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { closePool } from "../test/setup.js";
import { app } from "./app.js";

afterAll(closePool);

describe("listing parse api", () => {
  it("POST /listings/parse returns a structured draft without saving", async () => {
    const res = await request(app)
      .post("/listings/parse")
      .send({ text: "2BHK for rent in Andheri West 400058, budget 45k" });
    expect(res.status).toBe(200);
    expect(res.body.txn).toBe("rent");
    expect(res.body.bhk).toBe(2);
    expect(res.body.pincode).toBe("400058");
    expect(res.body.budget).toBe(45000);
  });

  it("400 on empty text", async () => {
    const res = await request(app).post("/listings/parse").send({});
    expect(res.status).toBe(400);
  });
});
