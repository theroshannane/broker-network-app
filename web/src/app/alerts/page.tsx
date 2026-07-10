"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getAlerts, ApiError } from "@/lib/api";
import type { Alert } from "@/lib/types";

export default function AlertsPage() {
  const { broker, loading: authLoading } = useAuth();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!broker) return;
    getAlerts(broker.id)
      .then(setAlerts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "failed to load alerts"))
      .finally(() => setLoading(false));
  }, [broker]);

  if (authLoading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!broker) return <p className="text-sm text-gray-500">Set up your profile first.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Alerts</h1>
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && alerts.length === 0 && (
        <p className="text-sm text-gray-500">No alerts yet.</p>
      )}
      <ul className="flex flex-col gap-3">
        {alerts.map(({ id, listing }) => (
          <li key={id} className="border border-gray-200 rounded p-4">
            <Link href={`/listings/${listing.id}`} className="flex justify-between">
              <span>
                {listing.txn.toUpperCase()} in {listing.locality}
              </span>
              <span className="font-medium">
                {"\u20b9"}
                {listing.budget.toLocaleString("en-IN")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
