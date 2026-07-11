import type { Pool } from "pg";
import { client, driver } from "./client.js";

// PGlite (tests/local): drop and recreate so every run starts clean.
const PGLITE_DDL = `
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

// Postgres/Neon (production): idempotent and non-destructive. Enums are guarded
// with duplicate_object handlers; tables use IF NOT EXISTS. Boots preserve data.
const PG_DDL = `
DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE txn_type AS ENUM ('sell', 'buy', 'rent');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('pending', 'approved', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text NOT NULL,
  agency_name text,
  rera_id text,
  pan text,
  verification verification_status NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
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

CREATE TABLE IF NOT EXISTS contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id),
  requester_id uuid NOT NULL REFERENCES brokers(id),
  status request_status NOT NULL DEFAULT 'pending',
  sla_expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES brokers(id),
  txn txn_type NOT NULL,
  locality text NOT NULL,
  max_budget integer NOT NULL,
  specs text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES requirements(id),
  listing_id uuid NOT NULL REFERENCES listings(id),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamp NOT NULL,
  consumed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
`;

export async function initSchema() {
  if (driver === "pg") {
    await (client as unknown as Pool).query(PG_DDL);
  } else {
    await client.exec(PGLITE_DDL);
  }
}
