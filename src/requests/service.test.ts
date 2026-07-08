import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { resetDb, closePool } from "../test/setup.js";
import { createBroker } from "../brokers/service.js";
import { createListing } from "../listings/service.js";
import {
  requestContact,
  approveRequest,
  sweepExpired,
  getRequest,
} from "./service.js";

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

describe("contact request", () => {
  it("creates a pending request with a future SLA", async () => {
    const { requester, listing } = await seed();
    const r = await requestContact({ listingId: listing.id, requesterId: requester.id });
    expect(r.status).toBe("pending");
    expect(r.slaExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("approves a pending request", async () => {
    const { requester, listing } = await seed();
    const r = await requestContact({ listingId: listing.id, requesterId: requester.id });
    const approved = await approveRequest(r.id);
    expect(approved.status).toBe("approved");
  });

  it("sweep expires past-SLA pending requests only", async () => {
    const { requester, listing } = await seed();
    const r = await requestContact({
      listingId: listing.id, requesterId: requester.id, slaHours: -1,
    });
    const n = await sweepExpired();
    expect(n).toBe(1);
    const after = await getRequest(r.id);
    expect(after?.status).toBe("expired");
  });

  it("sweep does not expire approved requests", async () => {
    const { requester, listing } = await seed();
    const r = await requestContact({
      listingId: listing.id, requesterId: requester.id, slaHours: -1,
    });
    await approveRequest(r.id);
    const n = await sweepExpired();
    expect(n).toBe(0);
  });
});
