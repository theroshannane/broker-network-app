import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { resetDb, closePool } from "../test/setup.js";
import { createBroker } from "../brokers/service.js";
import { createListing } from "../listings/service.js";
import { createRequirement, getAlertsForBroker } from "./service.js";

beforeEach(resetDb);
afterAll(closePool);

async function broker(phone: string) {
  return createBroker({ phone, name: "B", reraId: "R" });
}

describe("requirements + alerts", () => {
  it("creates a standing requirement", async () => {
    const b = await broker("9990000010");
    const r = await createRequirement({
      brokerId: b.id, txn: "rent", locality: "Andheri West", maxBudget: 50000,
    });
    expect(r.id).toBeDefined();
    expect(r.maxBudget).toBe(50000);
  });

  it("generates an alert when a matching listing is created", async () => {
    const seeker = await broker("9990000011");
    const owner = await broker("9990000012");
    await createRequirement({ brokerId: seeker.id, txn: "rent", locality: "Andheri West", maxBudget: 50000 });
    await createListing({ brokerId: owner.id, txn: "rent", locality: "Andheri West", pincode: "400058", budget: 45000 });
    const alerts = await getAlertsForBroker(seeker.id);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].listing.locality).toBe("Andheri West");
  });

  it("no alert when listing budget exceeds requirement max", async () => {
    const seeker = await broker("9990000013");
    const owner = await broker("9990000014");
    await createRequirement({ brokerId: seeker.id, txn: "rent", locality: "Andheri West", maxBudget: 40000 });
    await createListing({ brokerId: owner.id, txn: "rent", locality: "Andheri West", pincode: "400058", budget: 45000 });
    expect(await getAlertsForBroker(seeker.id)).toHaveLength(0);
  });

  it("no alert when txn type differs", async () => {
    const seeker = await broker("9990000015");
    const owner = await broker("9990000016");
    await createRequirement({ brokerId: seeker.id, txn: "rent", locality: "Powai", maxBudget: 50000 });
    await createListing({ brokerId: owner.id, txn: "sell", locality: "Powai", pincode: "400076", budget: 40000 });
    expect(await getAlertsForBroker(seeker.id)).toHaveLength(0);
  });

  it("no alert when locality differs", async () => {
    const seeker = await broker("9990000017");
    const owner = await broker("9990000018");
    await createRequirement({ brokerId: seeker.id, txn: "rent", locality: "Bandra", maxBudget: 50000 });
    await createListing({ brokerId: owner.id, txn: "rent", locality: "Powai", pincode: "400076", budget: 40000 });
    expect(await getAlertsForBroker(seeker.id)).toHaveLength(0);
  });
});
