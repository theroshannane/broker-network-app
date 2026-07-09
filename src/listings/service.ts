import { and, count, eq, isNull, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import { listings } from "../db/schema.js";
import { generateAlertsForListing } from "../requirements/service.js";

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export interface CreateListingInput {
  brokerId: string;
  txn: "sell" | "buy" | "rent";
  locality: string;
  pincode: string;
  budget: number;
  specs?: string;
}

export async function createListing(input: CreateListingInput) {
  const [row] = await db.insert(listings).values(input).returning();
  await generateAlertsForListing(row);
  return row;
}

export interface SearchInput {
  locality?: string;
  txn?: "sell" | "buy" | "rent";
  limit?: number;
  offset?: number;
}

function buildFilters(input: SearchInput) {
  const filters = [isNull(listings.closed)];
  if (input.locality) filters.push(ilike(listings.locality, input.locality));
  if (input.txn) filters.push(eq(listings.txn, input.txn));
  return filters;
}

export async function searchListings(input: SearchInput) {
  const limit = Math.min(input.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
  const offset = input.offset ?? 0;
  return db
    .select()
    .from(listings)
    .where(and(...buildFilters(input)))
    .limit(limit)
    .offset(offset);
}

export async function countListings(input: SearchInput): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(listings)
    .where(and(...buildFilters(input)));
  return row?.total ?? 0;
}

export async function closeListing(id: string) {
  const [row] = await db
    .update(listings)
    .set({ closed: new Date() })
    .where(eq(listings.id, id))
    .returning();
  return row;
}
