"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createListing, parseListingBulk, ApiError } from "@/lib/api";
import type { Txn } from "@/lib/types";

const TXNS: Txn[] = ["sell", "buy", "rent"];

interface DraftRow {
  selected: boolean;
  txn: Txn;
  locality: string;
  pincode: string;
  budget: string;
  specs: string;
  status: "idle" | "creating" | "created" | "error";
  error?: string;
}

function toRow(draft: { txn?: Txn; locality?: string; pincode?: string; budget?: number; specs?: string }): DraftRow {
  return {
    selected: true,
    txn: draft.txn ?? "sell",
    locality: draft.locality ?? "",
    pincode: draft.pincode ?? "",
    budget: draft.budget ? String(draft.budget) : "",
    specs: draft.specs ?? "",
    status: "idle",
  };
}

export default function BulkListingIngestPage() {
  const router = useRouter();
  const { broker, loading } = useAuth();

  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!broker) return <p className="text-sm text-gray-500">Set up your profile first.</p>;

  async function handleParseAll() {
    setError(null);
    setParsing(true);
    setRows([]);
    try {
      const { drafts } = await parseListingBulk(rawText);
      setRows(drafts.map(({ draft }) => toRow(draft)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "failed to parse dump");
    } finally {
      setParsing(false);
    }
  }

  function updateRow(i: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleCreateSelected() {
    setCreating(true);
    const selectedIndexes = rows
      .map((r, i) => (r.selected && r.status !== "created" ? i : -1))
      .filter((i) => i >= 0);

    for (const i of selectedIndexes) {
      const row = rows[i];
      if (!row.locality || row.pincode.length !== 6 || !row.budget) {
        updateRow(i, { status: "error", error: "fill locality, 6-digit pincode, budget" });
        continue;
      }
      updateRow(i, { status: "creating", error: undefined });
      try {
        await createListing({
          brokerId: broker!.id,
          txn: row.txn,
          locality: row.locality,
          pincode: row.pincode,
          budget: Number(row.budget),
          specs: row.specs || undefined,
        });
        updateRow(i, { status: "created" });
      } catch (err) {
        updateRow(i, {
          status: "error",
          error: err instanceof ApiError ? err.message : "failed to create",
        });
      }
    }
    setCreating(false);
  }

  const createdCount = rows.filter((r) => r.status === "created").length;

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Bulk ingest (paste WhatsApp dump)</h1>
      <p className="text-sm text-gray-500">
        Paste a forwarded broker-group message with multiple listings. We split
        and parse each one — review and confirm before publishing.
      </p>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex flex-col gap-2 border border-gray-200 rounded p-4">
        <label className="text-sm font-medium">Raw text dump</label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={"2BHK for rent in Andheri West 400058, budget 45k\n\n3BHK for sale in Powai, 1.2 cr"}
          className="w-full border border-gray-300 rounded px-3 py-2"
          rows={8}
        />
        <button
          type="button"
          onClick={handleParseAll}
          disabled={parsing || !rawText}
          className="self-start border border-gray-300 rounded px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {parsing ? "Parsing..." : "Parse all"}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">
              {rows.length} draft{rows.length === 1 ? "" : "s"} found
              {createdCount > 0 ? ` — ${createdCount} created` : ""}
            </h2>
            <button
              type="button"
              onClick={handleCreateSelected}
              disabled={creating || rows.every((r) => !r.selected || r.status === "created")}
              className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create selected"}
            </button>
          </div>

          <ul className="flex flex-col gap-3">
            {rows.map((row, i) => (
              <li key={i} className="border border-gray-200 rounded p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(e) => updateRow(i, { selected: e.target.checked })}
                      disabled={row.status === "created"}
                    />
                    Include
                  </label>
                  <span className="text-xs text-gray-500">
                    {row.status === "created" && "Created"}
                    {row.status === "creating" && "Creating..."}
                    {row.status === "error" && (
                      <span className="text-red-600">{row.error}</span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm">
                    Transaction type
                    <select
                      value={row.txn}
                      onChange={(e) => updateRow(i, { txn: e.target.value as Txn })}
                      disabled={row.status === "created"}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                    >
                      {TXNS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Budget (INR)
                    <input
                      type="number"
                      value={row.budget}
                      onChange={(e) => updateRow(i, { budget: e.target.value })}
                      disabled={row.status === "created"}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                    />
                  </label>
                  <label className="text-sm">
                    Locality
                    <input
                      type="text"
                      value={row.locality}
                      onChange={(e) => updateRow(i, { locality: e.target.value })}
                      disabled={row.status === "created"}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                    />
                  </label>
                  <label className="text-sm">
                    Pincode
                    <input
                      type="text"
                      minLength={6}
                      maxLength={6}
                      value={row.pincode}
                      onChange={(e) => updateRow(i, { pincode: e.target.value })}
                      disabled={row.status === "created"}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                    />
                  </label>
                </div>
                <label className="text-sm">
                  Specs (optional)
                  <textarea
                    value={row.specs}
                    onChange={(e) => updateRow(i, { specs: e.target.value })}
                    disabled={row.status === "created"}
                    className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                    rows={2}
                  />
                </label>
              </li>
            ))}
          </ul>

          {createdCount > 0 && (
            <button
              type="button"
              onClick={() => router.push("/listings")}
              className="self-start border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              View listings
            </button>
          )}
        </div>
      )}
    </div>
  );
}
