export interface ParsedListing {
  txn?: "sell" | "buy" | "rent";
  locality?: string;
  pincode?: string;
  budget?: number;
  bhk?: number;
  specs?: string;
}

export interface ListingParser {
  parse(text: string): Promise<ParsedListing>;
}

function extractTxn(text: string): ParsedListing["txn"] | undefined {
  if (/\b(rent|lease|rental)\b/i.test(text)) return "rent";
  if (/\b(sale|sell|resale|selling)\b/i.test(text)) return "sell";
  if (/\b(buy|purchase|looking to buy|wanted)\b/i.test(text)) return "buy";
  return undefined;
}

function extractBhk(text: string): number | undefined {
  const m = text.match(/(\d+)\s*bhk/i);
  return m ? Number(m[1]) : undefined;
}

function extractPincode(text: string): string | undefined {
  const m = text.match(/\b(\d{6})\b/);
  return m ? m[1] : undefined;
}

const UNIT_MULTIPLIERS: Array<[RegExp, number]> = [
  [/\b(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/i, 1e7],
  [/\b(\d+(?:\.\d+)?)\s*(?:lakh|lac|lacs|lakhs|l)\b/i, 1e5],
  [/\b(\d+(?:\.\d+)?)\s*k\b/i, 1e3],
];

function extractBudget(text: string): number | undefined {
  for (const [re, mult] of UNIT_MULTIPLIERS) {
    const m = text.match(re);
    if (m) return Math.round(Number(m[1]) * mult);
  }
  const plain = text.match(/budget\s*(?:of|is|:)?\s*(\d{4,})/i);
  if (plain) return Number(plain[1]);
  return undefined;
}

function extractLocality(text: string): string | undefined {
  const m = text.match(/\bin\s+([a-z][a-z .]*?)(?=\s*\d|,|$)/i);
  if (!m) return undefined;
  const loc = m[1].trim();
  return loc.length > 0 ? loc : undefined;
}

export const heuristicParser: ListingParser = {
  async parse(text: string): Promise<ParsedListing> {
    return {
      txn: extractTxn(text),
      bhk: extractBhk(text),
      pincode: extractPincode(text),
      budget: extractBudget(text),
      locality: extractLocality(text),
    };
  },
};

// Returns the active listing parser. Heuristic (deterministic, zero-cost) for now.
// A real LLM adapter (OpenAI/Anthropic) is an env-gated follow-on that would fall
// back to heuristicParser when no API key is configured.
export function getParser(): ListingParser {
  return heuristicParser;
}
