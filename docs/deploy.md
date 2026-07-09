# Deploy Notes

## Required environment variables

| Var | Required | Notes |
|---|---|---|
| `AUTH_SECRET` | Yes | HMAC secret for auth tokens. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PORT` | No | Defaults to 3000 |
| `PGLITE_DIR` | Yes (prod) | File-backed PGlite data directory. Must point at a **persistent volume** — the process is a single-node in-process Postgres (PGlite/WASM), not a managed DB server. Losing this directory loses all data. |
| `SWEEP_INTERVAL_MS` | No | Contact-request SLA sweep interval, default 15 min |
| `SUREPASS_API_TOKEN` | No | RERA/KYC verification. Unset = stub verification (RERA present -> verified) |
| `OPENAI_API_KEY` | No | LLM listing parser. Unset = heuristic regex parser |

## Docker

```bash
docker build -t broker-network-app .
docker run -p 3000:3000 \
  -e AUTH_SECRET=<generated-secret> \
  -e SUREPASS_API_TOKEN=<token-if-available> \
  -e OPENAI_API_KEY=<key-if-available> \
  -v broker-network-data:/data/pglite \
  broker-network-app
```

The image mounts `/data/pglite` as a volume and sets `PGLITE_DIR` to it by
default. Always attach a named volume in production — without it, data is
lost on every container restart.

## Platforms without Docker (Railway, Render, Heroku-style)

`Procfile` runs `npm run build && node dist/index.js`. Set `PGLITE_DIR` to a
path on the platform's persistent disk (not `/tmp` or ephemeral storage).

## Known limitation

PGlite is single-process, in-process Postgres. It does not support multiple
app instances/replicas sharing one data directory. Horizontal scaling
requires migrating to a real managed Postgres instance first (swap
`src/db/client.ts`'s PGlite client for a `pg`/`postgres.js` driver against
the managed DB; `src/db/schema.ts` and Drizzle queries are otherwise
unchanged).
