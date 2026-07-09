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

// Returns the active matcher. Heuristic weighted scoring (txn/locality/budget/specs)
// for now. A real embedding matcher (pgvector cosine similarity over listing/query
// embeddings) is an env-gated follow-on that falls back to heuristicMatcher.
export function getMatcher(): SmartMatcher {
  return heuristicMatcher;
}
