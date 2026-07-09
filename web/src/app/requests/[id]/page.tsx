"use client";

import { use, useEffect, useState } from "react";
import { getRequestStatus, getContactReveal, ApiError } from "@/lib/api";
import type { ContactReveal, RequestDetail } from "@/lib/types";

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [reveal, setReveal] = useState<ContactReveal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const d = await getRequestStatus(id);
      setDetail(d);
      if (d.status === "approved") {
        try {
          const r = await getContactReveal(id);
          setReveal(r);
        } catch {
          // not yet revealable
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "request not found");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!detail) return null;

  return (
    <div className="max-w-sm flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Request status</h1>
      <p className="text-sm">
        Status: <span className="font-medium">{detail.status}</span>
      </p>
      {detail.status === "pending" && (
        <p className="text-sm text-gray-600">
          Queue position: {detail.queuePosition}
        </p>
      )}
      {detail.status === "approved" && reveal && (
        <div className="border border-gray-200 rounded p-4 flex flex-col gap-1">
          <p className="font-medium">{reveal.name}</p>
          <p className="text-sm text-gray-600">{reveal.phone}</p>
        </div>
      )}
      {detail.status === "expired" && (
        <p className="text-sm text-gray-500">This request has expired.</p>
      )}
      <button
        onClick={() => {
          setLoading(true);
          load();
        }}
        className="border border-gray-300 rounded px-4 py-2 w-fit"
      >
        Refresh
      </button>
    </div>
  );
}
