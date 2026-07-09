import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { brokers } from "../db/schema.js";
import { runVerification } from "./verification.js";

export interface CreateBrokerInput {
  phone: string;
  name: string;
  agencyName?: string;
  reraId?: string;
  pan?: string;
}

export async function createBroker(input: CreateBrokerInput) {
  const verification = await runVerification({
    reraId: input.reraId,
    pan: input.pan,
  });
  const [row] = await db
    .insert(brokers)
    .values({
      phone: input.phone,
      name: input.name,
      agencyName: input.agencyName,
      reraId: input.reraId,
      pan: input.pan,
      verification,
    })
    .returning();
  return row;
}

export async function getBroker(id: string) {
  const [row] = await db.select().from(brokers).where(eq(brokers.id, id));
  return row ?? null;
}

export async function getBrokerByPhone(phone: string) {
  const [row] = await db.select().from(brokers).where(eq(brokers.phone, phone));
  return row ?? null;
}
