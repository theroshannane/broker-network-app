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

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const PARSE_SYSTEM_PROMPT =
  "Extract structured real-estate listing fields from the user's text. " +
  "Respond with ONLY a JSON object with keys: txn (one of \"sell\", \"buy\", \"rent\", or omit), " +
  "locality (string or omit), pincode (6-digit string or omit), budget (number in rupees or omit), " +
  "bhk (integer or omit), specs (string or omit). No prose, no markdown fences.";

// Real LLM adapter. Falls back to the deterministic heuristicParser on any
// network/API/parse failure so callers always get a usable result.
export function createOpenAIParser(
  apiKey: string,
  fetchImpl: FetchFn = fetch,
): ListingParser {
  return {
    async parse(text: string): Promise<ParsedListing> {
      try {
        const res = await fetchImpl(OPENAI_CHAT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: PARSE_SYSTEM_PROMPT },
              { role: "user", content: text },
            ],
            temperature: 0,
          }),
        });
        if (!res.ok) return heuristicParser.parse(text);
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (!content) return heuristicParser.parse(text);
        const parsed = JSON.parse(content) as ParsedListing;
        return parsed;
      } catch {
        return heuristicParser.parse(text);
      }
    },
  };
}

// Returns the active listing parser. Uses OpenAI when OPENAI_API_KEY is set,
// otherwise falls back to the deterministic heuristic parser.
export function getParser(
  env: Record<string, string | undefined> = process.env,
): ListingParser {
  const key = env.OPENAI_API_KEY;
  if (key && key.trim().length > 0) return createOpenAIParser(key);
  return heuristicParser;
}
