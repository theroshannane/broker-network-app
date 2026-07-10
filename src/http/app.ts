import express from "express";
import { z } from "zod";
import { createBroker, getBrokerByPhone } from "../brokers/service.js";
import {
  createListing,
  searchListings,
  countListings,
  getListingById,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from "../listings/service.js";
import {
  requestContact,
  approveRequest,
  getRequest,
  getRevealForRequest,
  queuePosition,
  getIncomingRequestsForBroker,
} from "../requests/service.js";
import {
  createRequirement,
  getAlertsForBroker,
  smartMatchForRequirement,
} from "../requirements/service.js";
import { getParser, splitListingDump } from "../ai/parser.js";
import { requestOtp, verifyOtp } from "../auth/service.js";
import { requireAuth } from "../auth/middleware.js";
import { rateLimit } from "./rateLimit.js";
import { errorHandler } from "./errorHandler.js";

export const app = express();
app.use(express.json());

const otpRateLimit = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyFn: (req) => String(req.body?.phone ?? req.ip ?? "unknown"),
});

const requestOtpSchema = z.object({ phone: z.string().min(10) });

app.post("/auth/request-otp", otpRateLimit, async (req, res) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  await requestOtp(parsed.data.phone);
  res.status(202).json({ ok: true });
});

const verifyOtpSchema = z.object({ phone: z.string().min(10), code: z.string().length(6) });

app.post("/auth/verify-otp", otpRateLimit, async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const token = await verifyOtp(parsed.data.phone, parsed.data.code);
  if (!token) {
    res.status(401).json({ error: "invalid or expired code" });
    return;
  }
  res.json({ token });
});

const brokerSchema = z.object({
  phone: z.string().min(10),
  name: z.string().min(1),
  agencyName: z.string().optional(),
  reraId: z.string().optional(),
  pan: z.string().optional(),
});

app.post("/brokers", requireAuth, async (req, res) => {
  const parsed = brokerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const broker = await createBroker(parsed.data);
  res.status(201).json(broker);
});

const listingSchema = z.object({
  brokerId: z.uuid(),
  txn: z.enum(["sell", "buy", "rent"]),
  locality: z.string().min(1),
  pincode: z.string().min(6),
  budget: z.number().int().positive(),
  specs: z.string().optional(),
});

app.post("/listings", requireAuth, async (req, res) => {
  const parsed = listingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const listing = await createListing(parsed.data);
  res.status(201).json(listing);
});

app.get("/listings", async (req, res) => {
  const locality = typeof req.query.locality === "string" ? req.query.locality : undefined;
  const txn = ["sell", "buy", "rent"].includes(String(req.query.txn))
    ? (req.query.txn as "sell" | "buy" | "rent")
    : undefined;
  const rawLimit = Number(req.query.limit);
  const rawOffset = Number(req.query.offset);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_PAGE_LIMIT)
    : DEFAULT_PAGE_LIMIT;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const [results, total] = await Promise.all([
    searchListings({ locality, txn, limit, offset }),
    countListings({ locality, txn }),
  ]);
  res.set("X-Total-Count", String(total)).json(results);
});

app.get("/listings/:id", async (req, res) => {
  const listing = await getListingById(req.params.id);
  if (!listing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(listing);
});

app.get("/brokers/me", requireAuth, async (req, res) => {
  const auth = (req as import("../auth/middleware.js").AuthedRequest).auth;
  const broker = await getBrokerByPhone(auth!.phone);
  if (!broker) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(broker);
});

app.get("/brokers/:id/incoming-requests", async (req, res) => {
  const incoming = await getIncomingRequestsForBroker(req.params.id);
  res.json(incoming);
});

const requestSchema = z.object({
  requesterId: z.uuid(),
});

app.post("/listings/:id/requests", requireAuth, async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const r = await requestContact({
    listingId: req.params.id,
    requesterId: parsed.data.requesterId,
  });
  res.status(201).json({ id: r.id, status: r.status, slaExpiresAt: r.slaExpiresAt });
});

app.post("/requests/:id/approve", requireAuth, async (req, res) => {
  const r = await approveRequest(req.params.id);
  if (!r) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({ id: r.id, status: r.status });
});

app.get("/requests/:id/contact", async (req, res) => {
  const reveal = await getRevealForRequest(req.params.id);
  if (!reveal) {
    res.status(403).json({ error: "not approved" });
    return;
  }
  res.json(reveal);
});

app.get("/requests/:id", async (req, res) => {
  const r = await getRequest(req.params.id);
  if (!r) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const pos = await queuePosition(req.params.id);
  res.json({ id: r.id, status: r.status, queuePosition: pos });
});

const requirementSchema = z.object({
  brokerId: z.uuid(),
  txn: z.enum(["sell", "buy", "rent"]),
  locality: z.string().min(1),
  maxBudget: z.number().int().positive(),
  specs: z.string().optional(),
});

app.post("/requirements", requireAuth, async (req, res) => {
  const parsed = requirementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const requirement = await createRequirement(parsed.data);
  res.status(201).json(requirement);
});

const parseSchema = z.object({
  text: z.string().min(1),
});

// Parses messy listing text into a structured draft. Does NOT save — the broker
// reviews and confirms before POST /listings (human-in-the-loop).
app.post("/listings/parse", async (req, res) => {
  const parsed = parseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const draft = await getParser().parse(parsed.data.text);
  res.json(draft);
});

const parseBulkSchema = z.object({
  text: z.string().min(1),
});

// Splits a raw multi-listing dump (e.g. a forwarded WhatsApp broker-group
// message) into chunks and parses each into a structured draft. Does NOT
// save — the broker reviews/selects drafts before individually confirming
// via POST /listings (human-in-the-loop, same contract as /listings/parse).
app.post("/listings/parse-bulk", async (req, res) => {
  const parsed = parseBulkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const chunks = splitListingDump(parsed.data.text);
  if (chunks.length === 0) {
    res.status(400).json({ error: "no parseable listings found in text" });
    return;
  }
  const parser = getParser();
  const drafts = await Promise.all(
    chunks.map(async (text) => ({ text, draft: await parser.parse(text) })),
  );
  res.json({ drafts });
});

app.get("/brokers/:id/alerts", async (req, res) => {
  const alerts = await getAlertsForBroker(req.params.id);
  res.json(alerts);
});

app.get("/requirements/:id/smart-match", async (req, res) => {
  const ranked = await smartMatchForRequirement(req.params.id);
  if (!ranked) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(ranked);
});

app.use(errorHandler);
