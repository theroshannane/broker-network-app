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
  email: text("email"),
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

export const requirements = pgTable("requirements", {
  id: uuid("id").defaultRandom().primaryKey(),
  brokerId: uuid("broker_id").notNull().references(() => brokers.id),
  txn: txnType("txn").notNull(),
  locality: text("locality").notNull(),
  maxBudget: integer("max_budget").notNull(),
  specs: text("specs"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  requirementId: uuid("requirement_id").notNull().references(() => requirements.id),
  listingId: uuid("listing_id").notNull().references(() => listings.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const otpChallenges = pgTable("otp_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
