import "dotenv/config";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema.js";

// PGLITE_DIR unset -> in-memory (used by tests). Set a path for a persistent dev DB.
const dataDir = process.env.PGLITE_DIR;
export const client = dataDir ? new PGlite(dataDir) : new PGlite();
export const db = drizzle(client, { schema });
