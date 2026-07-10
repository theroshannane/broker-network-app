"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createListing, parseListingText, ApiError } from "@/lib/api";
import type { Txn } from "@/lib/types";

const TXNS: Txn[] = ["sell", "buy", "rent"];

export default function NewListingPage() {
  const router = useRouter();
  const { broker, loading } = useAuth();

  const [txn, setTxn] = useState<Txn>("sell");
  const [locality, setLocality] = useState("");
  const [pincode, setPincode] = useState("");
  const [budget, setBudget] = useState("");
  const [specs, setSpecs] = useState("");
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!broker) return <p className="text-sm text-gray-500">Set up your profile first.</p>;

  async function handleParse() {
    setError(null);
    setParsing(true);
    try {
      const draft = await parseListingText(rawText);
      if (draft.txn) setTxn(draft.txn);
      if (draft.locality) setLocality(draft.locality);
      if (draft.pincode) setPincode(draft.pincode);
      if (draft.budget) setBudget(String(draft.budget));
      if (draft.specs) setSpecs(draft.specs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "failed to parse text");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const listing = await createListing({
        brokerId: broker!.id,
        txn,
        locality,
        pincode,
        budget: Number(budget),
        specs: specs || undefined,
      });
      router.replace(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "failed to create listing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Post a listing</h1>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex flex-col gap-2 border border-gray-200 rounded p-4">
        <label className="text-sm font-medium">Paste listing text</label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="e.g. 2BHK for sale in Andheri West, 400001, budget 1.2 Cr"
          className="w-full border border-gray-300 rounded px-3 py-2"
          rows={3}
        />
        <button
          type="button"
          onClick={handleParse}
          disabled={parsing || !rawText}
          className="self-start border border-gray-300 rounded px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {parsing ? "Parsing..." : "Parse & autofill"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm">
          Transaction type
          <select
            value={txn}
            onChange={(e) => setTxn(e.target.value as Txn)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
          >
            {TXNS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Locality
          <input
            type="text"
            required
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Pincode
          <input
            type="text"
            required
            minLength={6}
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Budget (INR)
          <input
            type="number"
            required
            min={1}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Specs (optional)
          <textarea
            value={specs}
            onChange={(e) => setSpecs(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            rows={3}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          Post listing
        </button>
      </form>
    </div>
  );
}
