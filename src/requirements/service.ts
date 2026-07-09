import { and, eq, gte, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import { requirements, alerts, listings } from "../db/schema.js";

export interface CreateRequirementInput {
  brokerId: string;
  txn: "sell" | "buy" | "rent";
  locality: string;
  maxBudget: number;
  specs?: string;
}

export async function createRequirement(input: CreateRequirementInput) {
  const [row] = await db.insert(requirements).values(input).returning();
  return row;
}

export interface MatchableListing {
  id: string;
  txn: "sell" | "buy" | "rent";
  locality: string;
  budget: number;
}

// Called on listing creation. Inserts an alert for every standing requirement
// this listing matches (same txn, same locality, listing budget within max).
export async function generateAlertsForListing(listing: MatchableListing) {
  const matches = await db
    .select()
    .from(requirements)
    .where(
      and(
        eq(requirements.txn, listing.txn),
        ilike(requirements.locality, listing.locality),
        gte(requirements.maxBudget, listing.budget),
      ),
    );
  if (matches.length === 0) return [];
  const rows = await db
    .insert(alerts)
    .values(matches.map((m) => ({ requirementId: m.id, listingId: listing.id })))
    .returning();
  return rows;
}

export async function getAlertsForBroker(brokerId: string) {
  const rows = await db
    .select({ alert: alerts, listing: listings })
    .from(alerts)
    .innerJoin(requirements, eq(alerts.requirementId, requirements.id))
    .innerJoin(listings, eq(alerts.listingId, listings.id))
    .where(eq(requirements.brokerId, brokerId));
  return rows.map((r) => ({
    id: r.alert.id,
    createdAt: r.alert.createdAt,
    listing: r.listing,
  }));
}
