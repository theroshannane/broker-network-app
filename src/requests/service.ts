import { and, eq, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { contactRequests } from "../db/schema.js";

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
  return row;
}

export async function getRequest(id: string) {
  const [row] = await db
    .select()
    .from(contactRequests)
    .where(eq(contactRequests.id, id));
  return row ?? null;
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
