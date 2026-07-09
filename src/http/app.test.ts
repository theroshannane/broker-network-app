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

  it("GET /listings/:id returns a single listing", async () => {
    const broker = await request(app)
      .post("/brokers")
      .set(...authHeader())
      .send({ phone: "9993336666", name: "Rohit", reraId: "R-3" });
    const listing = await request(app)
      .post("/listings")
      .set(...authHeader())
      .send({
        brokerId: broker.body.id, txn: "sell",
        locality: "Wadala", pincode: "400031", budget: 8000000,
      });
    const res = await request(app).get(`/listings/${listing.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.locality).toBe("Wadala");
  });

  it("404 on GET /listings/:id for missing listing", async () => {
    const res = await request(app).get("/listings/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("GET /brokers/me returns the authenticated broker's profile", async () => {
    await request(app)
      .post("/brokers")
      .set(...authHeader("9993337777"))
      .send({ phone: "9993337777", name: "Divya", reraId: "R-4" });
    const res = await request(app)
      .get("/brokers/me")
      .set(...authHeader("9993337777"));
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe("9993337777");
  });

  it("404 on GET /brokers/me when broker not yet created", async () => {
    const res = await request(app)
      .get("/brokers/me")
      .set(...authHeader("9993338888"));
    expect(res.status).toBe(404);
  });

  it("GET /brokers/:id/incoming-requests returns pending requests on own listings", async () => {
    const owner = await request(app)
      .post("/brokers")
      .set(...authHeader())
      .send({ phone: "9993339999", name: "Owner", reraId: "R-5" });
    const requester = await request(app)
      .post("/brokers")
      .set(...authHeader())
      .send({ phone: "9993330000", name: "Requester", reraId: "R-6" });
    const listing = await request(app)
      .post("/listings")
      .set(...authHeader())
      .send({
        brokerId: owner.body.id, txn: "rent",
        locality: "Sion", pincode: "400022", budget: 35000,
      });
    await request(app)
      .post(`/listings/${listing.body.id}/requests`)
      .set(...authHeader())
      .send({ requesterId: requester.body.id });
    const res = await request(app).get(`/brokers/${owner.body.id}/incoming-requests`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].listingId).toBe(listing.body.id);
  });
});
