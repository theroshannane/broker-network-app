import { describe, it, expect } from "vitest";
import { heuristicParser, getParser } from "./parser.js";

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
