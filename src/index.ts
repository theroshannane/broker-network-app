import "dotenv/config";
import { initSchema } from "./db/init.js";
import { app } from "./http/app.js";
import { startSweep } from "./jobs/sweep.js";

// Bootstrap schema on boot. Idempotent and non-destructive on Postgres/Neon;
// drop-and-recreate on PGlite. Replaced by drizzle-kit migrations later.
await initSchema();

const port = Number(process.env.PORT ?? 3000);
const sweepMs = Number(process.env.SWEEP_INTERVAL_MS ?? 15 * 60 * 1000);
startSweep(sweepMs, (n) => {
  if (n > 0) console.log(`SLA sweep expired ${n} request(s)`);
});

app.listen(port, () => console.log(`API on :${port}`));
