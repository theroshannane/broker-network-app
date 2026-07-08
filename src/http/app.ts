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

app.post("/listings", async (req, res) => {
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
  const results = await searchListings({ locality, txn });
  res.json(results);
});
