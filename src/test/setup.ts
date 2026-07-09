import { db, client } from "../db/client.js";
import { initSchema } from "../db/init.js";
import {
  alerts,
  requirements,
  contactRequests,
  listings,
  brokers,
  otpChallenges,
} from "../db/schema.js";

// Each test file re-imports this module (Vitest isolates modules per file),
// getting a fresh in-memory PGlite instance. Bootstrap schema once here.
await initSchema(client);

export async function resetDb() {
  await db.delete(alerts);
  await db.delete(requirements);
  await db.delete(contactRequests);
  await db.delete(listings);
  await db.delete(brokers);
  await db.delete(otpChallenges);
}

export async function closePool() {
  await client.close();
}
