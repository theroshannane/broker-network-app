import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { resetDb, closePool } from "../test/setup.js";
import { createBroker } from "../brokers/service.js";
import { createListing, searchListings, closeListing } from "./service.js";

beforeEach(resetDb);
afterAll(closePool);

async function seedBroker() {
  return createBroker({ phone: "9995550000", name: "Seed", reraId: "R-1" });
}

describe("listing service", () => {
  it("creates a listing owned by a broker", async () => {
    const b = await seedBroker();
    const l = await createListing({
      brokerId: b.id,
      txn: "rent",
      locality: "Andheri West",
      pincode: "400058",
      budget: 45000,
    });
    expect(l.id).toBeDefined();
    expect(l.txn).toBe("rent");
  });

  it("searches by locality and txn", async () => {
    const b = await seedBroker();
    await createListing({ brokerId: b.id, txn: "rent", locality: "Andheri West", pincode: "400058", budget: 45000 });
    await createListing({ brokerId: b.id, txn: "sell", locality: "Powai", pincode: "400076", budget: 12000000 });
    const results = await searchListings({ locality: "Andheri West", txn: "rent" });
    expect(results).toHaveLength(1);
    expect(results[0].locality).toBe("Andheri West");
  });

  it("filters out closed listings from search", async () => {
    const b = await seedBroker();
    const l = await createListing({ brokerId: b.id, txn: "rent", locality: "Thane", pincode: "400601", budget: 30000 });
    await closeListing(l.id);
    const results = await searchListings({ locality: "Thane" });
    expect(results).toHaveLength(0);
  });
});
