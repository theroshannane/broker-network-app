import { describe, it, expect } from "vitest";
import { heuristicMatcher, getMatcher, type MatchableListing } from "./match.js";

const listings: MatchableListing[] = [
  { id: "a", txn: "rent", locality: "Andheri West", budget: 45000, specs: "2bhk sea view" },
  { id: "b", txn: "rent", locality: "Andheri East", budget: 60000, specs: "3bhk" },
  { id: "c", txn: "sell", locality: "Andheri West", budget: 45000, specs: "2bhk" },
  { id: "d", txn: "rent", locality: "Bandra", budget: 200000, specs: "1bhk" },
];

describe("heuristic smart match", () => {
  it("ranks same-txn, same-locality, in-budget listings first", async () => {
    const ranked = await heuristicMatcher.match(
      { txn: "rent", locality: "Andheri West", maxBudget: 50000, specs: "2bhk" },
      listings,
    );
    expect(ranked[0].listing.id).toBe("a");
  });

  it("excludes mismatched txn from the top", async () => {
    const ranked = await heuristicMatcher.match(
      { txn: "rent", locality: "Andheri West", maxBudget: 50000 },
      listings,
    );
    const sellRank = ranked.findIndex((r) => r.listing.id === "c");
    const rentRank = ranked.findIndex((r) => r.listing.id === "a");
    expect(rentRank).toBeLessThan(sellRank);
  });

  it("penalises listings over budget", async () => {
    const ranked = await heuristicMatcher.match(
      { txn: "rent", locality: "Andheri", maxBudget: 50000 },
      listings,
    );
    const over = ranked.find((r) => r.listing.id === "d");
    const under = ranked.find((r) => r.listing.id === "a");
    expect(under!.score).toBeGreaterThan(over!.score);
  });

  it("returns scores between 0 and 1", async () => {
    const ranked = await heuristicMatcher.match(
      { txn: "rent", locality: "Andheri West", maxBudget: 50000 },
      listings,
    );
    for (const r of ranked) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it("getMatcher returns a usable matcher", async () => {
    const m = getMatcher();
    const ranked = await m.match(
      { txn: "rent", locality: "Andheri West", maxBudget: 50000 },
      listings,
    );
    expect(ranked.length).toBe(listings.length);
  });
});
