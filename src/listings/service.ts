import { and, eq, isNull, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import { listings } from "../db/schema.js";

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
  return row;
}

export interface SearchInput {
  locality?: string;
  txn?: "sell" | "buy" | "rent";
}

export async function searchListings(input: SearchInput) {
  const filters = [isNull(listings.closed)];
  if (input.locality) filters.push(ilike(listings.locality, input.locality));
  if (input.txn) filters.push(eq(listings.txn, input.txn));
  return db.select().from(listings).where(and(...filters));
}

export async function closeListing(id: string) {
  const [row] = await db
    .update(listings)
    .set({ closed: new Date() })
    .where(eq(listings.id, id))
    .returning();
  return row;
}
