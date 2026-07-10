"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { createRequirement, getSmartMatch, ApiError } from "@/lib/api";
import type { ScoredListing, Txn } from "@/lib/types";

const TXNS: Txn[] = ["sell", "buy", "rent"];

export default function NewRequirementPage() {
  const { broker, loading } = useAuth();

  const [txn, setTxn] = useState<Txn>("buy");
  const [locality, setLocality] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [specs, setSpecs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<ScoredListing[] | null>(null);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!broker) return <p className="text-sm text-gray-500">Set up your profile first.</p>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setMatches(null);
    try {
      const requirement = await createRequirement({
        brokerId: broker!.id,
        txn,
        locality,
        maxBudget: Number(maxBudget),
        specs: specs || undefined,
      });
      const scored = await getSmartMatch(requirement.id);
      setMatches(scored);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "failed to save requirement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Save a requirement</h1>

      {error && <p className="text-red-600 text-sm">{error}</p>}

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
          Max budget (INR)
          <input
            type="number"
            required
            min={1}
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
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
          Save & find matches
        </button>
      </form>

      {matches && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-gray-500">
            {matches.length === 0 ? "No matches yet" : "Smart matches"}
          </h2>
          <ul className="flex flex-col gap-3">
            {matches.map(({ listing, score }) => (
              <li key={listing.id} className="border border-gray-200 rounded p-4">
                <Link href={`/listings/${listing.id}`} className="flex justify-between">
                  <span>
                    {listing.txn.toUpperCase()} in {listing.locality}
                  </span>
                  <span className="font-medium">{Math.round(score * 100)}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
