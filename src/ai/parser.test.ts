import { describe, it, expect } from "vitest";
import { heuristicParser, getParser, splitListingDump } from "./parser.js";

describe("heuristic listing parser", () => {
  it("extracts txn, bhk, pincode, budget, locality from messy text", async () => {
    const r = await heuristicParser.parse(
      "2BHK for rent in Andheri West 400058, budget 45k",
    );
    expect(r.txn).toBe("rent");
    expect(r.bhk).toBe(2);
    expect(r.pincode).toBe("400058");
    expect(r.budget).toBe(45000);
    expect(r.locality?.toLowerCase()).toContain("andheri");
  });

  it("parses lakh and crore budgets", async () => {
    expect((await heuristicParser.parse("50 lakh")).budget).toBe(5000000);
    expect((await heuristicParser.parse("1.2 cr")).budget).toBe(12000000);
  });

  it("maps sale keywords to sell and buy keywords to buy", async () => {
    expect((await heuristicParser.parse("flat for sale")).txn).toBe("sell");
    expect((await heuristicParser.parse("looking to buy a flat")).txn).toBe("buy");
  });

  it("returns undefined fields when nothing matches", async () => {
    const r = await heuristicParser.parse("hello there");
    expect(r.txn).toBeUndefined();
    expect(r.budget).toBeUndefined();
    expect(r.pincode).toBeUndefined();
  });

  it("getParser returns a usable parser", async () => {
    const p = getParser();
    const r = await p.parse("3 bhk rent");
    expect(r.bhk).toBe(3);
  });
});

describe("splitListingDump", () => {
  it("splits blank-line separated entries into individual chunks", () => {
    const dump =
      "2BHK for rent in Andheri West 400058, budget 45k\n\n" +
      "3BHK for sale in Powai, 1.2 cr\n\n" +
      "Looking to buy 1BHK in Thane, budget 40 lakh";
    const chunks = splitListingDump(dump);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toContain("Andheri West");
    expect(chunks[1]).toContain("Powai");
    expect(chunks[2]).toContain("Thane");
  });

  it("splits numbered-list entries with no blank lines", () => {
    const dump =
      "1. 2BHK for rent in Andheri West, budget 45k\n" +
      "2. 3BHK for sale in Powai, 1.2 cr\n" +
      "3. 1BHK for rent in Thane, budget 20k";
    const chunks = splitListingDump(dump);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toContain("Andheri West");
    expect(chunks[2]).toContain("Thane");
  });

  it("splits entries separated by dash/star dividers", () => {
    const dump =
      "2BHK for rent in Andheri West, budget 45k\n---\n3BHK for sale in Powai, 1.2 cr";
    const chunks = splitListingDump(dump);
    expect(chunks).toHaveLength(2);
  });

  it("returns a single chunk for a single-listing dump", () => {
    const chunks = splitListingDump("2BHK for rent in Andheri West, budget 45k");
    expect(chunks).toHaveLength(1);
  });

  it("drops empty/whitespace-only lines and returns empty array for blank input", () => {
    expect(splitListingDump("   \n\n  ")).toEqual([]);
  });
});
