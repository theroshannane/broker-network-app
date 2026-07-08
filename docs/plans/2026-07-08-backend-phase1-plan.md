# Backend Phase 1 Implementation Plan

**Goal:** Build the backend spine for the broker network — broker signup/auth,
verification status, listing CRUD, and the contact-request flow with an
auto-expiring SLA queue.

**Architecture:** Node.js + TypeScript REST API using Express. Postgres via
Drizzle ORM. Zod for input validation at boundaries. Verification (RERA/KYC) is
a pluggable service with a stub adapter in Phase 1 (real Surepass/KYC wired
later). Contact-request SLA expiry runs via a periodic sweep function (no Redis
in Phase 1 — YAGNI; a timestamp column + sweep is enough at pilot scale).

**Tech Stack:** Node 22, TypeScript, Express, Drizzle ORM, node-postgres (pg),
Zod, Vitest, Supertest.

**Scope note:** Mobile app (Expo), web (Next.js), AI listing parser, and AI
Smart Match are separate follow-on plans. This plan is API + data layer only.

---

## Conventions

- Source in `src/`, tests colocated in `src/**/*.test.ts`.
- Every task is test-first. Run the test, watch it fail, implement, watch it pass, commit.
- DB tests run against a local Postgres database `broker_test` (set via `DATABASE_URL`).
- Do not pin exact package versions in commands; install current stable.

---

## Task 0: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`, `src/index.ts`

**Step 1: Init npm + install deps**

```bash
cd /Users/roshan/Downloads/broker-network-app
npm init -y
npm install express drizzle-orm pg zod dotenv
npm install -D typescript tsx vitest supertest @types/express @types/pg @types/supertest @types/node drizzle-kit
```

**Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    sequence: { concurrent: false },
    fileParallelism: false,
  },
});
```

**Step 4: Write `.gitignore`**

```
node_modules
dist
.env
.DS_Store
```

**Step 5: Write `.env.example`**

```
DATABASE_URL=postgres://localhost:5432/broker_dev
PORT=3000
```

**Step 6: Add scripts to `package.json`**

Set `"type": "module"` and scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "db:push": "drizzle-kit push"
  }
}
```

**Step 7: Create Postgres databases**

```bash
createdb broker_dev; createdb broker_test
```

**Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore .env.example
git commit -m "chore: scaffold backend project"
```

---

## Task 1: Database schema + connection

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`

**Step 1: Write `src/db/schema.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const verificationStatus = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
]);

export const txnType = pgEnum("txn_type", ["sell", "buy", "rent"]);

export const requestStatus = pgEnum("request_status", [
  "pending",
  "approved",
  "expired",
]);

export const brokers = pgTable("brokers", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  agencyName: text("agency_name"),
  reraId: text("rera_id"),
  pan: text("pan"),
  verification: verificationStatus("verification").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  brokerId: uuid("broker_id").notNull().references(() => brokers.id),
  txn: txnType("txn").notNull(),
  locality: text("locality").notNull(),
  pincode: text("pincode").notNull(),
  budget: integer("budget").notNull(),
  specs: text("specs"),
  closed: timestamp("closed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contactRequests = pgTable("contact_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id").notNull().references(() => listings.id),
  requesterId: uuid("requester_id").notNull().references(() => brokers.id),
  status: requestStatus("status").notNull().default("pending"),
  slaExpiresAt: timestamp("sla_expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Step 2: Write `src/db/client.ts`**

```ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export { pool };
```

**Step 3: Write `drizzle.config.ts`**

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

**Step 4: Push schema to test DB**

```bash
DATABASE_URL=postgres://localhost:5432/broker_test npm run db:push
DATABASE_URL=postgres://localhost:5432/broker_dev npm run db:push
```

Expected: tables created, no error.

**Step 5: Commit**

```bash
git add src/db drizzle.config.ts
git commit -m "feat: add db schema and client"
```

---

## Task 2: Test helpers

**Files:**
- Create: `src/test/setup.ts`

**Step 1: Write `src/test/setup.ts`**

```ts
import { pool, db } from "../db/client.js";
import { contactRequests, listings, brokers } from "../db/schema.js";

export async function resetDb() {
  await db.delete(contactRequests);
  await db.delete(listings);
  await db.delete(brokers);
}

export async function closePool() {
  await pool.end();
}
```

**Step 2: Commit**

```bash
git add src/test/setup.ts
git commit -m "test: add db reset helper"
```

---

## Task 3: Broker service — signup + verification

**Files:**
- Create: `src/brokers/verification.ts`, `src/brokers/service.ts`, `src/brokers/service.test.ts`

**Step 1: Write failing test `src/brokers/service.test.ts`**

```ts
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { resetDb, closePool } from "../test/setup.js";
import { createBroker, getBroker } from "./service.js";

beforeEach(resetDb);
afterAll(closePool);

describe("broker service", () => {
  it("creates a broker with pending verification", async () => {
    const b = await createBroker({ phone: "9990001111", name: "Asha" });
    expect(b.id).toBeDefined();
    expect(b.verification).toBe("pending");
  });

  it("verifies broker when RERA id present (stub passes)", async () => {
    const b = await createBroker({
      phone: "9990002222",
      name: "Ravi",
      reraId: "RERA-MH-123",
    });
    const fetched = await getBroker(b.id);
    expect(fetched?.verification).toBe("verified");
  });

  it("rejects duplicate phone", async () => {
    await createBroker({ phone: "9990003333", name: "A" });
    await expect(
      createBroker({ phone: "9990003333", name: "B" }),
    ).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgres://localhost:5432/broker_test npm test -- src/brokers`
Expected: FAIL, module `./service.js` not found.

**Step 3: Write `src/brokers/verification.ts`**

```ts
// Phase 1 stub. Real Surepass RERA + KYC adapter wired in a later plan.
export interface VerificationInput {
  reraId?: string;
  pan?: string;
}

export type VerificationResult = "pending" | "verified" | "rejected";

export async function runVerification(
  input: VerificationInput,
): Promise<VerificationResult> {
  if (input.reraId && input.reraId.trim().length > 0) return "verified";
  return "pending";
}
```

**Step 4: Write `src/brokers/service.ts`**

```ts
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
```

**Step 5: Run test to verify it passes**

Run: `DATABASE_URL=postgres://localhost:5432/broker_test npm test -- src/brokers`
Expected: PASS (3 tests).

**Step 6: Commit**

```bash
git add src/brokers
git commit -m "feat: broker signup with verification stub"
```

---

## Task 4: Listing service — CRUD + search

**Files:**
- Create: `src/listings/service.ts`, `src/listings/service.test.ts`

**Step 1: Write failing test `src/listings/service.test.ts`**

```ts
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { resetDb, closePool } from "../test/setup.js";
import { createBroker } from "../brokers/service.js";
import { createListing, searchListings, closeListing } from "./service.js";

beforeEach(resetDb);
afterAll(closePool);

async function seedBroker() {
  return createBroker({ phone: "9995550000", name: "Seed", reraId: "R-1" });
}

describe("listing service", () => {
  it("creates a listing owned by a broker", async () => {
    const b = await seedBroker();
    const l = await createListing({
      brokerId: b.id,
      txn: "rent",
      locality: "Andheri West",
      pincode: "400058",
      budget: 45000,
    });
    expect(l.id).toBeDefined();
    expect(l.txn).toBe("rent");
  });

  it("searches by locality and txn", async () => {
    const b = await seedBroker();
    await createListing({ brokerId: b.id, txn: "rent", locality: "Andheri West", pincode: "400058", budget: 45000 });
    await createListing({ brokerId: b.id, txn: "sell", locality: "Powai", pincode: "400076", budget: 12000000 });
    const results = await searchListings({ locality: "Andheri West", txn: "rent" });
    expect(results).toHaveLength(1);
    expect(results[0].locality).toBe("Andheri West");
  });

  it("filters out closed listings from search", async () => {
    const b = await seedBroker();
    const l = await createListing({ brokerId: b.id, txn: "rent", locality: "Thane", pincode: "400601", budget: 30000 });
    await closeListing(l.id);
    const results = await searchListings({ locality: "Thane" });
    expect(results).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgres://localhost:5432/broker_test npm test -- src/listings`
Expected: FAIL, module `./service.js` not found.

**Step 3: Write `src/listings/service.ts`**

```ts
import { and, eq, isNull, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import { listings } from "../db/schema.js";

export interface CreateListingInput {
  brokerId: string;
  txn: "sell" | "buy" | "rent";
  locality: string;
  pincode: string;
  budget: number;
  specs?: string;
}

export async function createListing(input: CreateListingInput) {
  const [row] = await db.insert(listings).values(input).returning();
  return row;
}

export interface SearchInput {
  locality?: string;
  txn?: "sell" | "buy" | "rent";
}

export async function searchListings(input: SearchInput) {
  const filters = [isNull(listings.closed)];
  if (input.locality) filters.push(ilike(listings.locality, input.locality));
  if (input.txn) filters.push(eq(listings.txn, input.txn));
  return db.select().from(listings).where(and(...filters));
}

export async function closeListing(id: string) {
  const [row] = await db
    .update(listings)
    .set({ closed: new Date() })
    .where(eq(listings.id, id))
    .returning();
  return row;
}
```

**Step 4: Run test to verify it passes**

Run: `DATABASE_URL=postgres://localhost:5432/broker_test npm test -- src/listings`
Expected: PASS (3 tests).

**Step 5: Commit**

```bash
git add src/listings
git commit -m "feat: listing crud and search"
```

---

## Task 5: Contact-request flow with SLA queue

**Files:**
- Create: `src/requests/service.ts`, `src/requests/service.test.ts`

**Step 1: Write failing test `src/requests/service.test.ts`**

```ts
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { resetDb, closePool } from "../test/setup.js";
import { createBroker } from "../brokers/service.js";
import { createListing } from "../listings/service.js";
import {
  requestContact,
  approveRequest,
  sweepExpired,
  getRequest,
} from "./service.js";

beforeEach(resetDb);
afterAll(closePool);

async function seed() {
  const owner = await createBroker({ phone: "9990000001", name: "Owner", reraId: "R" });
  const requester = await createBroker({ phone: "9990000002", name: "Req", reraId: "R" });
  const listing = await createListing({
    brokerId: owner.id, txn: "rent", locality: "Kurla", pincode: "400070", budget: 30000,
  });
  return { owner, requester, listing };
}

describe("contact request", () => {
  it("creates a pending request with a future SLA", async () => {
    const { requester, listing } = await seed();
    const r = await requestContact({ listingId: listing.id, requesterId: requester.id });
    expect(r.status).toBe("pending");
    expect(r.slaExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("approves a pending request", async () => {
    const { requester, listing } = await seed();
    const r = await requestContact({ listingId: listing.id, requesterId: requester.id });
    const approved = await approveRequest(r.id);
    expect(approved.status).toBe("approved");
  });

  it("sweep expires past-SLA pending requests only", async () => {
    const { requester, listing } = await seed();
    const r = await requestContact({
      listingId: listing.id, requesterId: requester.id, slaHours: -1,
    });
    const n = await sweepExpired();
    expect(n).toBe(1);
    const after = await getRequest(r.id);
    expect(after?.status).toBe("expired");
  });

  it("sweep does not expire approved requests", async () => {
    const { requester, listing } = await seed();
    const r = await requestContact({
      listingId: listing.id, requesterId: requester.id, slaHours: -1,
    });
    await approveRequest(r.id);
    const n = await sweepExpired();
    expect(n).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgres://localhost:5432/broker_test npm test -- src/requests`
Expected: FAIL, module `./service.js` not found.

**Step 3: Write `src/requests/service.ts`**

```ts
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
```

**Step 4: Run test to verify it passes**

Run: `DATABASE_URL=postgres://localhost:5432/broker_test npm test -- src/requests`
Expected: PASS (4 tests).

**Step 5: Commit**

```bash
git add src/requests
git commit -m "feat: contact request flow with sla sweep"
```

---

## Task 6: HTTP API layer

**Files:**
- Create: `src/http/app.ts`, `src/http/app.test.ts`, `src/index.ts`

**Step 1: Write failing test `src/http/app.test.ts`**

```ts
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { resetDb, closePool } from "../test/setup.js";
import { app } from "./app.js";

beforeEach(resetDb);
afterAll(closePool);

describe("api", () => {
  it("POST /brokers creates a broker", async () => {
    const res = await request(app)
      .post("/brokers")
      .send({ phone: "9991112222", name: "Neha", reraId: "R-9" });
    expect(res.status).toBe(201);
    expect(res.body.verification).toBe("verified");
  });

  it("400 on invalid broker payload", async () => {
    const res = await request(app).post("/brokers").send({ name: "NoPhone" });
    expect(res.status).toBe(400);
  });

  it("POST /listings then GET /listings finds it", async () => {
    const broker = await request(app)
      .post("/brokers")
      .send({ phone: "9993334444", name: "Amit", reraId: "R-1" });
    await request(app).post("/listings").send({
      brokerId: broker.body.id, txn: "rent",
      locality: "Vashi", pincode: "400703", budget: 40000,
    });
    const res = await request(app).get("/listings?locality=Vashi");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgres://localhost:5432/broker_test npm test -- src/http`
Expected: FAIL, module `./app.js` not found.

**Step 3: Write `src/http/app.ts`**

```ts
import express from "express";
import { z } from "zod";
import { createBroker } from "../brokers/service.js";
import { createListing, searchListings } from "../listings/service.js";

export const app = express();
app.use(express.json());

const brokerSchema = z.object({
  phone: z.string().min(10),
  name: z.string().min(1),
  agencyName: z.string().optional(),
  reraId: z.string().optional(),
  pan: z.string().optional(),
});

app.post("/brokers", async (req, res) => {
  const parsed = brokerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const broker = await createBroker(parsed.data);
  res.status(201).json(broker);
});

const listingSchema = z.object({
  brokerId: z.string().uuid(),
  txn: z.enum(["sell", "buy", "rent"]),
  locality: z.string().min(1),
  pincode: z.string().min(6),
  budget: z.number().int().positive(),
  specs: z.string().optional(),
});

app.post("/listings", async (req, res) => {
  const parsed = listingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const listing = await createListing(parsed.data);
  res.status(201).json(listing);
});

app.get("/listings", async (req, res) => {
  const locality = typeof req.query.locality === "string" ? req.query.locality : undefined;
  const txn = ["sell", "buy", "rent"].includes(String(req.query.txn))
    ? (req.query.txn as "sell" | "buy" | "rent")
    : undefined;
  const results = await searchListings({ locality, txn });
  res.json(results);
});
```

**Step 4: Write `src/index.ts`**

```ts
import "dotenv/config";
import { app } from "./http/app.js";

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API on :${port}`));
```

**Step 5: Run test to verify it passes**

Run: `DATABASE_URL=postgres://localhost:5432/broker_test npm test -- src/http`
Expected: PASS (3 tests).

**Step 6: Run full suite**

Run: `DATABASE_URL=postgres://localhost:5432/broker_test npm test`
Expected: all tests pass.

**Step 7: Commit**

```bash
git add src/http src/index.ts
git commit -m "feat: http api for brokers and listings"
```

---

## Acceptance Criteria

- Broker signup returns `verified` when a RERA id is supplied, else `pending`.
- Duplicate phone rejected.
- Listing create/search works; closed listings excluded from search.
- Contact request created with future SLA; approvable; sweep expires only
  past-SLA pending requests, never approved ones.
- HTTP layer validates input (400 on bad payload) and wires broker + listing endpoints.
- Full `npm test` suite green.

## Follow-on Plans (not in this scope)

1. Contact-request HTTP endpoints + reveal-payload gating + queue position.
2. Saved-requirement profiles + alert matching.
3. AI listing parser (LLM extract) + AI Smart Match (embeddings + pgvector).
4. Real Surepass RERA + Aadhaar/PAN KYC adapters replacing the stub.
5. Mobile app (Expo) and Next.js web (onboarding, admin, SEO listing pages).
6. Scheduled SLA sweep runner (cron/worker) calling `sweepExpired`.
