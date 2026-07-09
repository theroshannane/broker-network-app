import type { PGlite } from "@electric-sql/pglite";

// Idempotent schema bootstrap. Drops and recreates all objects.
// Mirrors src/db/schema.ts. Real Postgres migrations (drizzle-kit) replace this
// in a later plan once a Postgres server is available.
const DDL = `
DROP TABLE IF EXISTS otp_challenges;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS requirements;
DROP TABLE IF EXISTS contact_requests;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS brokers;
DROP TYPE IF EXISTS request_status;
DROP TYPE IF EXISTS txn_type;
DROP TYPE IF EXISTS verification_status;

CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE txn_type AS ENUM ('sell', 'buy', 'rent');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'expired');

CREATE TABLE brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text NOT NULL,
  agency_name text,
  rera_id text,
  pan text,
  verification verification_status NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES brokers(id),
  txn txn_type NOT NULL,
  locality text NOT NULL,
  pincode text NOT NULL,
  budget integer NOT NULL,
  specs text,
  closed timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id),
  requester_id uuid NOT NULL REFERENCES brokers(id),
  status request_status NOT NULL DEFAULT 'pending',
  sla_expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES brokers(id),
  txn txn_type NOT NULL,
  locality text NOT NULL,
  max_budget integer NOT NULL,
  specs text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES requirements(id),
  listing_id uuid NOT NULL REFERENCES listings(id),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamp NOT NULL,
  consumed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
`;

export async function initSchema(pg: PGlite) {
  await pg.exec(DDL);
}
