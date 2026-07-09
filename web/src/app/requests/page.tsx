"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRequestStatus } from "@/lib/api";
import { getSentRequestIds } from "@/lib/sentRequests";
import type { RequestDetail } from "@/lib/types";

interface Row extends RequestDetail {
  id: string;
}

export default function SentRequestsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getSentRequestIds();
    Promise.all(
      ids.map(async (id) => {
        try {
          const d = await getRequestStatus(id);
          return { ...d, id };
        } catch {
          return null;
        }
      }),
    )
      .then((results) => setRows(results.filter((r): r is Row => r !== null)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Sent requests</h1>
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-gray-500">No requests sent yet.</p>
      )}
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="border border-gray-200 rounded p-4">
            <Link href={`/requests/${row.id}`} className="flex justify-between">
              <span>Request {row.id.slice(0, 8)}</span>
              <span className="font-medium">{row.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
