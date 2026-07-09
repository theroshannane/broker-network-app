"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getListing, sendContactRequest, ApiError } from "@/lib/api";
import { addSentRequestId } from "@/lib/sentRequests";
import type { Listing } from "@/lib/types";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { broker, isAuthenticated } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getListing(id)
      .then(setListing)
      .catch(() => setError("listing not found"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleRequest() {
    if (!broker) return;
    setSending(true);
    setError(null);
    try {
      const r = await sendContactRequest(id, broker.id);
      addSentRequestId(r.id);
      router.push(`/requests/${r.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "failed to send request");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (error && !listing) return <p className="text-red-600 text-sm">{error}</p>;
  if (!listing) return null;

  const isOwnListing = broker?.id === listing.brokerId;

  return (
    <div className="flex flex-col gap-4 max-w-sm">
      <h1 className="text-xl font-semibold">
        {listing.txn.toUpperCase()} in {listing.locality}
      </h1>
      <dl className="text-sm flex flex-col gap-1">
        <div>
          <dt className="inline text-gray-500">Pincode: </dt>
          <dd className="inline">{listing.pincode}</dd>
        </div>
        <div>
          <dt className="inline text-gray-500">Budget: </dt>
          <dd className="inline">
            {"\u20b9"}
            {listing.budget.toLocaleString("en-IN")}
          </dd>
        </div>
        {listing.specs && (
          <div>
            <dt className="inline text-gray-500">Specs: </dt>
            <dd className="inline">{listing.specs}</dd>
          </div>
        )}
      </dl>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!isAuthenticated && (
        <p className="text-sm text-gray-500">Log in to request contact details.</p>
      )}
      {isAuthenticated && isOwnListing && (
        <p className="text-sm text-gray-500">This is your listing.</p>
      )}
      {isAuthenticated && !isOwnListing && broker && (
        <button
          onClick={handleRequest}
          disabled={sending}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50 w-fit"
        >
          Request contact
        </button>
      )}
    </div>
  );
}
