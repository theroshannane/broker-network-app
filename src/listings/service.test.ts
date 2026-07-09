import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { resetDb, closePool } from "../test/setup.js";
import { createBroker } from "../brokers/service.js";
import { createListing, searchListings, countListings, closeListing } from "./service.js";

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

  it("applies default limit and offset", async () => {
    const b = await seedBroker();
    for (let i = 0; i < 5; i += 1) {
      await createListing({
        brokerId: b.id, txn: "rent", locality: "Kharghar", pincode: "410210", budget: 20000 + i,
      });
    }
    const page1 = await searchListings({ locality: "Kharghar", limit: 2, offset: 0 });
    const page2 = await searchListings({ locality: "Kharghar", limit: 2, offset: 2 });
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it("countListings returns total ignoring limit/offset", async () => {
    const b = await seedBroker();
    for (let i = 0; i < 3; i += 1) {
      await createListing({
        brokerId: b.id, txn: "rent", locality: "Vikhroli", pincode: "400079", budget: 20000 + i,
      });
    }
    const total = await countListings({ locality: "Vikhroli" });
    const page = await searchListings({ locality: "Vikhroli", limit: 1, offset: 0 });
    expect(total).toBe(3);
    expect(page).toHaveLength(1);
  });
});
