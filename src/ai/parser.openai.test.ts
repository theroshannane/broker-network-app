import { describe, it, expect, vi } from "vitest";
import { createOpenAIParser, getParser } from "./parser.js";
import { heuristicParser } from "./parser.js";

describe("openai listing parser adapter", () => {
  it("parses OpenAI response JSON into ParsedListing", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  txn: "rent",
                  locality: "Andheri West",
                  pincode: "400058",
                  budget: 45000,
                  bhk: 2,
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const parser = createOpenAIParser("test-key", fetchImpl);
    const r = await parser.parse("2BHK for rent in Andheri West 400058, budget 45k");
    expect(r.txn).toBe("rent");
    expect(r.bhk).toBe(2);
    expect(r.pincode).toBe("400058");
    expect(r.budget).toBe(45000);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      }),
    );
  });

  it("falls back to heuristic parser on API error", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 500 }));
    const parser = createOpenAIParser("test-key", fetchImpl);
    const r = await parser.parse("2 bhk rent");
    expect(r.bhk).toBe(2);
    expect(r.txn).toBe("rent");
  });

  it("falls back to heuristic parser on malformed JSON content", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "not json" } }] }),
        { status: 200 },
      ),
    );
    const parser = createOpenAIParser("test-key", fetchImpl);
    const r = await parser.parse("3 bhk sale");
    expect(r.bhk).toBe(3);
    expect(r.txn).toBe("sell");
  });

  it("getParser returns openai adapter when OPENAI_API_KEY set", () => {
    const p = getParser({ OPENAI_API_KEY: "abc" });
    expect(p).not.toBe(heuristicParser);
  });

  it("getParser returns heuristic parser when no OPENAI_API_KEY", () => {
    const p = getParser({});
    expect(p).toBe(heuristicParser);
  });
});
