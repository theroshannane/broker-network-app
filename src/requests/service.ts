import { and, eq, lt, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { contactRequests, listings, brokers } from "../db/schema.js";

const DEFAULT_SLA_HOURS = 48;

export interface RequestContactInput {
  listingId: string;
  requesterId: string;
  slaHours?: number;
}

export async function requestContact(input: RequestContactInput) {
  const hours = input.slaHours ?? DEFAULT_SLA_HOURS;
  const slaExpiresAt = new Date(Date.now() + hours * 3600 * 1000);
  const [row] = await db
    .insert(contactRequests)
    .values({
      listingId: input.listingId,
      requesterId: input.requesterId,
      slaExpiresAt,
    })
    .returning();
  return row;
}

export async function approveRequest(id: string) {
  const [row] = await db
    .update(contactRequests)
    .set({ status: "approved" })
    .where(eq(contactRequests.id, id))
    .returning();
  return row ?? null;
}

export async function getRequest(id: string) {
  const [row] = await db
    .select()
    .from(contactRequests)
    .where(eq(contactRequests.id, id));
  return row ?? null;
}

// Owner contact for a request, revealed only when the request is approved.
export async function getRevealForRequest(id: string) {
  const req = await getRequest(id);
  if (!req || req.status !== "approved") return null;
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, req.listingId));
  if (!listing) return null;
  const [owner] = await db
    .select()
    .from(brokers)
    .where(eq(brokers.id, listing.brokerId));
  if (!owner) return null;
  return { phone: owner.phone, name: owner.name, agencyName: owner.agencyName };
}

// 1-based position among still-pending requests on the same listing, by creation order.
export async function queuePosition(id: string) {
  const req = await getRequest(id);
  if (!req) return null;
  const earlier = await db
    .select()
    .from(contactRequests)
    .where(
      and(
        eq(contactRequests.listingId, req.listingId),
        eq(contactRequests.status, "pending"),
        lte(contactRequests.createdAt, req.createdAt),
      ),
    );
  return earlier.length;
}

// Pending contact requests on listings owned by this broker.
export async function getIncomingRequestsForBroker(brokerId: string) {
  return db
    .select({
      id: contactRequests.id,
      listingId: contactRequests.listingId,
      requesterId: contactRequests.requesterId,
      status: contactRequests.status,
      slaExpiresAt: contactRequests.slaExpiresAt,
      createdAt: contactRequests.createdAt,
    })
    .from(contactRequests)
    .innerJoin(listings, eq(listings.id, contactRequests.listingId))
    .where(
      and(
        eq(listings.brokerId, brokerId),
        eq(contactRequests.status, "pending"),
      ),
    );
}

// Marks past-SLA pending requests as expired. Returns count expired.
export async function sweepExpired() {
  const rows = await db
    .update(contactRequests)
    .set({ status: "expired" })
    .where(
      and(
        eq(contactRequests.status, "pending"),
        lt(contactRequests.slaExpiresAt, new Date()),
      ),
    )
    .returning();
  return rows.length;
}
