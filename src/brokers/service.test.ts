import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { resetDb, closePool } from "../test/setup.js";
import { createBroker, getBroker, getBrokerByPhone } from "./service.js";

beforeEach(resetDb);
afterAll(closePool);

describe("broker service", () => {
  it("creates a broker with pending verification", async () => {
    const b = await createBroker({ phone: "9990001111", name: "Asha" });
    expect(b.id).toBeDefined();
    expect(b.verification).toBe("pending");
  });

  it("verifies broker when RERA id present (stub passes)", async () => {
    const b = await createBroker({
      phone: "9990002222",
      name: "Ravi",
      reraId: "RERA-MH-123",
    });
    const fetched = await getBroker(b.id);
    expect(fetched?.verification).toBe("verified");
  });

  it("rejects duplicate phone", async () => {
    await createBroker({ phone: "9990003333", name: "A" });
    await expect(
      createBroker({ phone: "9990003333", name: "B" }),
    ).rejects.toThrow();
  });

  it("getBrokerByPhone finds broker by phone", async () => {
    const b = await createBroker({ phone: "9990004444", name: "Sana" });
    const fetched = await getBrokerByPhone("9990004444");
    expect(fetched?.id).toBe(b.id);
  });

  it("getBrokerByPhone returns null when not found", async () => {
    const fetched = await getBrokerByPhone("0000000000");
    expect(fetched).toBeNull();
  });
});
