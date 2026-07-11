import "dotenv/config";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema.js";

// DATABASE_URL set (e.g. Neon in production) -> node-postgres over TCP.
// Unset -> in-process PGlite (tests, local dev). PGlite's WASM Postgres is
// loaded dynamically so it never ships into the production memory footprint.
const databaseUrl = process.env.DATABASE_URL;

export const driver: "pg" | "pglite" = databaseUrl ? "pg" : "pglite";

// Typed as PgliteDatabase so every service compiles against one shape; the
// node-postgres driver is structurally the same pg dialect at runtime.
export let db: PgliteDatabase<typeof schema>;

// Raw driver handle. PGlite in the pglite branch (.exec/.close); a pg Pool in
// the pg branch. init.ts dispatches on `driver` before touching driver-specific
// methods, so the PGlite type here is a compile-time convenience only.
export let client: PGlite;

if (databaseUrl) {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: databaseUrl });
  db = drizzlePg(pool, { schema }) as unknown as PgliteDatabase<typeof schema>;
  client = pool as unknown as PGlite;
} else {
  const { PGlite: PGliteCtor } = await import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
  const dataDir = process.env.PGLITE_DIR;
  const pg = dataDir ? new PGliteCtor(dataDir) : new PGliteCtor();
  db = drizzlePglite(pg, { schema });
  client = pg;
}
