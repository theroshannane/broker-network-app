import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { resetDb, closePool } from "../test/setup.js";
import { createBroker } from "../brokers/service.js";
import { createListing } from "../listings/service.js";
import { requestContact, getRequest } from "../requests/service.js";
import { startSweep } from "./sweep.js";

beforeEach(resetDb);
afterAll(closePool);

describe("sla sweep runner", () => {
  it("periodically expires past-sla pending requests", async () => {
    const owner = await createBroker({ phone: "9993330001", name: "O", reraId: "R" });
    const requester = await createBroker({ phone: "9993330002", name: "R", reraId: "R" });
    const listing = await createListing({
      brokerId: owner.id, txn: "rent", locality: "X", pincode: "400001", budget: 10000,
    });
    const r = await requestContact({
      listingId: listing.id, requesterId: requester.id, slaHours: -1,
    });

    const swept = await new Promise<number>((resolve) => {
      const runner = startSweep(10, (n) => {
        if (n > 0) {
          runner.stop();
          resolve(n);
        }
      });
    });

    expect(swept).toBe(1);
    const after = await getRequest(r.id);
    expect(after?.status).toBe("expired");
  });
});
