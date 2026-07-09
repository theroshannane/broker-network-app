"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchListings } from "@/lib/api";
import type { Listing, Txn } from "@/lib/types";

const TXNS: Txn[] = ["sell", "buy", "rent"];

export default function ListingsPage() {
  const [locality, setLocality] = useState("");
  const [txn, setTxn] = useState<Txn | "">("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const results = await searchListings({
        locality: locality || undefined,
        txn: txn || undefined,
      });
      setListings(results);
    } catch {
      setError("failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Listings</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          placeholder="Locality"
          value={locality}
          onChange={(e) => setLocality(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 flex-1"
        />
        <select
          value={txn}
          onChange={(e) => setTxn(e.target.value as Txn | "")}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="">All</option>
          {TXNS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="submit" className="bg-black text-white rounded px-4 py-2">
          Search
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      <ul className="flex flex-col gap-3">
        {listings.map((listing) => (
          <li key={listing.id} className="border border-gray-200 rounded p-4">
            <Link href={`/listings/${listing.id}`} className="flex flex-col gap-1">
              <span className="font-medium">
                {listing.txn.toUpperCase()} in {listing.locality} ({listing.pincode})
              </span>
              <span className="text-sm text-gray-600">
                Budget: {"\u20b9"}
                {listing.budget.toLocaleString("en-IN")}
              </span>
              {listing.specs && (
                <span className="text-sm text-gray-500">{listing.specs}</span>
              )}
            </Link>
          </li>
        ))}
        {!loading && listings.length === 0 && (
          <p className="text-sm text-gray-500">No listings found.</p>
        )}
      </ul>
    </div>
  );
}
