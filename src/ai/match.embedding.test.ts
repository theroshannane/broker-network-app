import { describe, it, expect, vi } from "vitest";
import {
  createEmbeddingMatcher,
  getMatcher,
  heuristicMatcher,
  type MatchableListing,
} from "./match.js";

const listings: MatchableListing[] = [
  { id: "a", txn: "rent", locality: "Andheri West", budget: 45000, specs: "2bhk sea view" },
  { id: "b", txn: "rent", locality: "Andheri East", budget: 60000, specs: "3bhk" },
  { id: "c", txn: "sell", locality: "Andheri West", budget: 45000, specs: "2bhk" },
];

// Builds an embeddings API response. vecFor maps each input string to a vector,
// preserving OpenAI's input-order contract (data[i] <-> input[i]).
function embedResponse(vecFor: (input: string) => number[]) {
  return (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { input: string[] };
    const data = body.input.map((input) => ({ embedding: vecFor(input) }));
    return Promise.resolve(new Response(JSON.stringify({ data }), { status: 200 }));
  };
}

describe("embedding smart match", () => {
  it("ranks the listing whose embedding is closest to the query first", async () => {
    // Query and listing "b" share vector [1,0]; all others [0,1] (orthogonal).
    // "b" is same-txn and in-budget, so it must rank first on hybrid score.
    const fetchImpl = vi.fn(
      embedResponse((input) =>
        input.startsWith("rent property in Andheri East") ? [1, 0] : [0, 1],
      ),
    );
    const matcher = createEmbeddingMatcher("test-key", fetchImpl);
    const ranked = await matcher.match(
      { txn: "rent", locality: "Andheri East", maxBudget: 70000, specs: "3bhk" },
      listings,
    );
    expect(ranked[0].listing.id).toBe("b");
  });

  it("scores stay within 0..1", async () => {
    const fetchImpl = vi.fn(embedResponse(() => [0.5, 0.5]));
    const matcher = createEmbeddingMatcher("test-key", fetchImpl);
    const ranked = await matcher.match(
      { txn: "rent", locality: "Andheri West", maxBudget: 50000, specs: "2bhk" },
      listings,
    );
    for (const r of ranked) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it("batches query + all listings into a single embeddings call", async () => {
    const fetchImpl = vi.fn(embedResponse(() => [1, 0]));
    const matcher = createEmbeddingMatcher("test-key", fetchImpl);
    await matcher.match(
      { txn: "rent", locality: "Andheri West", maxBudget: 50000 },
      listings,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/embeddings");
    const body = JSON.parse(String(init?.body)) as { input: string[] };
    expect(body.input.length).toBe(listings.length + 1);
  });

  it("returns empty array for no listings without calling the API", async () => {
    const fetchImpl = vi.fn(embedResponse(() => [1, 0]));
    const matcher = createEmbeddingMatcher("test-key", fetchImpl);
    const ranked = await matcher.match(
      { txn: "rent", locality: "Andheri West", maxBudget: 50000 },
      [],
    );
    expect(ranked).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("falls back to heuristic matcher on API error", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 500 }));
    const matcher = createEmbeddingMatcher("test-key", fetchImpl);
    const ranked = await matcher.match(
      { txn: "rent", locality: "Andheri West", maxBudget: 50000, specs: "2bhk" },
      listings,
    );
    // Heuristic ranks the same-txn same-locality in-budget listing "a" first.
    expect(ranked[0].listing.id).toBe("a");
    expect(ranked.length).toBe(listings.length);
  });

  it("falls back to heuristic matcher on shape mismatch", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ embedding: [1, 0] }] }), { status: 200 }),
    );
    const matcher = createEmbeddingMatcher("test-key", fetchImpl);
    const ranked = await matcher.match(
      { txn: "rent", locality: "Andheri West", maxBudget: 50000, specs: "2bhk" },
      listings,
    );
    expect(ranked.length).toBe(listings.length);
  });

  it("getMatcher returns embedding adapter when OPENAI_API_KEY set", () => {
    const m = getMatcher({ OPENAI_API_KEY: "abc" });
    expect(m).not.toBe(heuristicMatcher);
  });

  it("getMatcher returns heuristic matcher when no OPENAI_API_KEY", () => {
    const m = getMatcher({});
    expect(m).toBe(heuristicMatcher);
  });
});
