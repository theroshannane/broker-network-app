export interface MatchableListing {
  id: string;
  txn: "sell" | "buy" | "rent";
  locality: string;
  budget: number;
  specs?: string | null;
}

export interface MatchQuery {
  txn: "sell" | "buy" | "rent";
  locality: string;
  maxBudget: number;
  specs?: string | null;
}

export interface ScoredListing {
  listing: MatchableListing;
  score: number;
}

export interface SmartMatcher {
  match(query: MatchQuery, listings: MatchableListing[]): Promise<ScoredListing[]>;
}

const WEIGHTS = { txn: 0.4, locality: 0.3, budget: 0.2, specs: 0.1 };

function tokens(s: string | null | undefined): Set<string> {
  return new Set(
    (s ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const t of a) if (b.has(t)) hits++;
  return hits / Math.max(a.size, b.size);
}

function localityScore(query: string, listing: string): number {
  const q = query.toLowerCase();
  const l = listing.toLowerCase();
  if (q === l) return 1;
  if (l.includes(q) || q.includes(l)) return 0.8;
  return overlap(tokens(query), tokens(listing));
}

function budgetScore(maxBudget: number, budget: number): number {
  if (budget <= maxBudget) return 1;
  // Linear decay: 20% over budget -> 0.
  const over = (budget - maxBudget) / maxBudget;
  return Math.max(0, 1 - over / 0.2);
}

function scoreOne(query: MatchQuery, listing: MatchableListing): number {
  const txn = query.txn === listing.txn ? 1 : 0;
  const loc = localityScore(query.locality, listing.locality);
  const bud = budgetScore(query.maxBudget, listing.budget);
  const spec = overlap(tokens(query.specs), tokens(listing.specs));
  return (
    txn * WEIGHTS.txn +
    loc * WEIGHTS.locality +
    bud * WEIGHTS.budget +
    spec * WEIGHTS.specs
  );
}

export const heuristicMatcher: SmartMatcher = {
  async match(query, listings) {
    return listings
      .map((listing) => ({ listing, score: scoreOne(query, listing) }))
      .sort((a, b) => b.score - a.score);
  },
};

const OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings";
const EMBED_MODEL = "text-embedding-3-small";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

// txn/budget stay hard structured signals; semantic embedding similarity replaces
// the token-overlap locality+specs part with true semantic matching.
const EMBED_WEIGHTS = { txn: 0.35, budget: 0.2, semantic: 0.45 };

function embedText(l: { txn: string; locality: string; specs?: string | null }): string {
  return `${l.txn} property in ${l.locality}. ${l.specs ?? ""}`.trim();
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Real embedding matcher. Embeds the query + all listings in one batched call,
// ranks by hybrid score (txn + budget + cosine semantic similarity). Falls back
// to heuristicMatcher on any network/API/shape failure so callers stay safe.
export function createEmbeddingMatcher(
  apiKey: string,
  fetchImpl: FetchFn = fetch,
): SmartMatcher {
  return {
    async match(query, listings) {
      if (listings.length === 0) return [];
      try {
        const inputs = [embedText(query), ...listings.map(embedText)];
        const res = await fetchImpl(OPENAI_EMBED_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
        });
        if (!res.ok) return heuristicMatcher.match(query, listings);
        const data = (await res.json()) as {
          data?: Array<{ embedding?: number[] }>;
        };
        const vectors = data.data;
        if (!vectors || vectors.length !== inputs.length) {
          return heuristicMatcher.match(query, listings);
        }
        const queryVec = vectors[0]?.embedding;
        if (!queryVec) return heuristicMatcher.match(query, listings);

        const scored = listings.map((listing, i) => {
          const vec = vectors[i + 1]?.embedding;
          const semantic = vec ? (cosine(queryVec, vec) + 1) / 2 : 0;
          const txn = query.txn === listing.txn ? 1 : 0;
          const bud = budgetScore(query.maxBudget, listing.budget);
          const score =
            txn * EMBED_WEIGHTS.txn +
            bud * EMBED_WEIGHTS.budget +
            semantic * EMBED_WEIGHTS.semantic;
          return { listing, score };
        });
        return scored.sort((a, b) => b.score - a.score);
      } catch {
        return heuristicMatcher.match(query, listings);
      }
    },
  };
}

// Returns the active matcher. Uses OpenAI embeddings when OPENAI_API_KEY is set,
// otherwise falls back to the deterministic heuristic weighted scorer.
export function getMatcher(
  env: Record<string, string | undefined> = process.env,
): SmartMatcher {
  const key = env.OPENAI_API_KEY;
  if (key && key.trim().length > 0) return createEmbeddingMatcher(key);
  return heuristicMatcher;
}
