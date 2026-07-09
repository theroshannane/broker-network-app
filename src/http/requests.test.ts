import { beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { resetDb, closePool } from "../test/setup.js";
import { app } from "./app.js";
import { createBroker } from "../brokers/service.js";
import { createListing } from "../listings/service.js";

beforeEach(resetDb);
afterAll(closePool);

async function seed() {
  const owner = await createBroker({ phone: "9990000001", name: "Owner", reraId: "R" });
  const requester = await createBroker({ phone: "9990000002", name: "Req", reraId: "R" });
  const listing = await createListing({
    brokerId: owner.id, txn: "rent", locality: "Kurla", pincode: "400070", budget: 30000,
  });
  return { owner, requester, listing };
}

describe("contact request api", () => {
  it("POST /listings/:id/requests creates a pending request without leaking contact", async () => {
    const { requester, listing, owner } = await seed();
    const res = await request(app)
      .post(`/listings/${listing.id}/requests`)
      .send({ requesterId: requester.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(JSON.stringify(res.body)).not.toContain(owner.phone);
  });

  it("400 on invalid request payload", async () => {
    const { listing } = await seed();
    const res = await request(app).post(`/listings/${listing.id}/requests`).send({});
    expect(res.status).toBe(400);
  });

  it("GET /requests/:id/contact 403 before approval", async () => {
    const { requester, listing } = await seed();
    const r = await request(app)
      .post(`/listings/${listing.id}/requests`)
      .send({ requesterId: requester.id });
    const res = await request(app).get(`/requests/${r.body.id}/contact`);
    expect(res.status).toBe(403);
  });

  it("reveals owner contact after approval", async () => {
    const { requester, listing, owner } = await seed();
    const r = await request(app)
      .post(`/listings/${listing.id}/requests`)
      .send({ requesterId: requester.id });
    await request(app).post(`/requests/${r.body.id}/approve`);
    const res = await request(app).get(`/requests/${r.body.id}/contact`);
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe(owner.phone);
    expect(res.body.name).toBe(owner.name);
  });

  it("GET /requests/:id returns status and queue position", async () => {
    const { requester, listing } = await seed();
    const other = await createBroker({ phone: "9990000003", name: "Other", reraId: "R" });
    await request(app).post(`/listings/${listing.id}/requests`).send({ requesterId: requester.id });
    const r2 = await request(app)
      .post(`/listings/${listing.id}/requests`)
      .send({ requesterId: other.id });
    const res = await request(app).get(`/requests/${r2.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
    expect(res.body.queuePosition).toBe(2);
  });
});
