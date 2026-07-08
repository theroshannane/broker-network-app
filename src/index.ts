import "dotenv/config";
import { PGlite } from "@electric-sql/pglite";
import { client } from "./db/client.js";
import { initSchema } from "./db/init.js";
import { app } from "./http/app.js";

// Bootstrap schema on boot. Safe for the file-backed dev DB (drops/recreates).
// Replaced by drizzle-kit migrations once a real Postgres server is provisioned.
await initSchema(client as PGlite);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API on :${port}`));
