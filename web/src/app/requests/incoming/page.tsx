"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getIncomingRequests, approveRequest, ApiError } from "@/lib/api";
import type { IncomingRequest } from "@/lib/types";

export default function IncomingRequestsPage() {
  const { broker, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function load() {
    if (!broker) return;
    setLoading(true);
    try {
      const results = await getIncomingRequests(broker.id);
      setRequests(results);
    } catch {
      setError("failed to load incoming requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && broker) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, broker]);

  async function handleApprove(id: string) {
    setApprovingId(id);
    setError(null);
    try {
      await approveRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "failed to approve");
    } finally {
      setApprovingId(null);
    }
  }

  if (authLoading || loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!broker) return <p className="text-sm text-gray-500">Set up your profile first.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Incoming requests</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {requests.length === 0 && (
        <p className="text-sm text-gray-500">No pending requests.</p>
      )}
      <ul className="flex flex-col gap-3">
        {requests.map((r) => (
          <li
            key={r.id}
            className="border border-gray-200 rounded p-4 flex items-center justify-between"
          >
            <span className="text-sm">
              Request on listing {r.listingId.slice(0, 8)}
            </span>
            <button
              onClick={() => handleApprove(r.id)}
              disabled={approvingId === r.id}
              className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50"
            >
              Approve
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
