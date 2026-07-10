import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { closePool } from "../test/setup.js";
import { app } from "./app.js";

afterAll(closePool);

describe("bulk listing parse api", () => {
  it("POST /listings/parse-bulk splits a dump and returns a draft per chunk", async () => {
    const dump =
      "2BHK for rent in Andheri West 400058, budget 45k\n\n" +
      "3BHK for sale in Powai, 1.2 cr";
    const res = await request(app).post("/listings/parse-bulk").send({ text: dump });
    expect(res.status).toBe(200);
    expect(res.body.drafts).toHaveLength(2);
    expect(res.body.drafts[0].text).toContain("Andheri West");
    expect(res.body.drafts[0].draft.txn).toBe("rent");
    expect(res.body.drafts[0].draft.budget).toBe(45000);
    expect(res.body.drafts[1].draft.txn).toBe("sell");
  });

  it("400 on empty text", async () => {
    const res = await request(app).post("/listings/parse-bulk").send({});
    expect(res.status).toBe(400);
  });

  it("400 when dump has no parseable entries", async () => {
    const res = await request(app).post("/listings/parse-bulk").send({ text: "   " });
    expect(res.status).toBe(400);
  });
});
