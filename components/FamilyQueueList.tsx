"use client";

// The approval queue list. Renders Pending / Approved / Rejected tabs via
// server-driven ?tab= param (handled by the page), and per-row Approve /
// Reject actions that call the family lifecycle APIs.
//
// Caching correction (2026-05-09): the earlier version only did
// client-side optimistic row removal, which left tab counts and sibling
// tab content stale. We now call router.refresh() after every successful
// action so the server component re-renders with live data, AND we re-sync
// local `rows` whenever the server-passed `initial` changes (tab switch
// + router.refresh both feed through this).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type QueueFamily = {
  id: string;
  status: "Pending" | "Approved" | "Rejected";
  primary_email: string;
  submitted_at: string;
  version: number;
  member_count: number;
  primary_given_name: string | null;
  rejection_reason: string | null;
};

export interface FamilyQueueListProps {
  tab: "Pending" | "Approved" | "Rejected";
  families: QueueFamily[];
}

export default function FamilyQueueList({
  tab,
  families: initial,
}: FamilyQueueListProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    id: string;
    kind: "error" | "info";
    text: string;
  } | null>(null);

  // Re-sync when the parent passes fresh data (tab switch, or after
  // router.refresh() repopulates the server-component output).
  useEffect(() => {
    setRows(initial);
  }, [initial]);

  async function callLifecycle(
    id: string,
    path: "approve" | "reject" | "reopen",
    expectedVersion: number,
    reason?: string
  ) {
    setBusy(id);
    setBanner(null);
    try {
      const res = await fetch(`/api/family/${id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion,
          ...(reason !== undefined ? { reason } : {}),
        }),
        cache: "no-store",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          id,
          kind: "error",
          text:
            j.error ||
            `Could not ${path} (HTTP ${res.status}). Please refresh and try again.`,
        });
        return;
      }
      // Optimistic: remove this row from the current tab.
      setRows((prev) => prev.filter((r) => r.id !== id));
      // Then ask the server to re-render — refreshes sibling tab counts
      // and brings the row into the right tab even if the user switches.
      router.refresh();
    } catch (e: any) {
      setBanner({
        id,
        kind: "error",
        text: e?.message ?? "Network error. Please try again.",
      });
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-600 bg-white border border-saffron-100 rounded-xl">
        No {tab.toLowerCase()} registrations.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {banner && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800"
        >
          {banner.text}
        </div>
      )}
      {rows.map((f) => (
        <QueueRow
          key={f.id}
          tab={tab}
          family={f}
          busy={busy === f.id}
          onApprove={(ver) => callLifecycle(f.id, "approve", ver)}
          onReject={(ver, reason) =>
            callLifecycle(f.id, "reject", ver, reason ?? "")
          }
          onReopen={(ver) => callLifecycle(f.id, "reopen", ver)}
        />
      ))}
    </div>
  );
}

function QueueRow({
  tab,
  family,
  busy,
  onApprove,
  onReject,
  onReopen,
}: {
  tab: "Pending" | "Approved" | "Rejected";
  family: QueueFamily;
  busy: boolean;
  onApprove: (ver: number) => void;
  onReject: (ver: number, reason: string) => void;
  onReopen: (ver: number) => void;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmApprove, setConfirmApprove] = useState(false);

  const when = new Date(family.submitted_at).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="p-4 bg-white border border-saffron-200 rounded-xl flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
              tab === "Pending"
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : tab === "Approved"
                ? "bg-green-50 border-green-300 text-green-800"
                : "bg-rose-50 border-rose-300 text-rose-800"
            }`}
          >
            {tab}
          </span>
          <span className="font-medium text-krishna-800 truncate">
            {family.primary_given_name || family.primary_email}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1 break-all">
          {family.primary_email} · {family.member_count} member
          {family.member_count === 1 ? "" : "s"} · submitted {when}
        </div>
        {family.rejection_reason && (
          <div className="text-xs text-rose-700 mt-1">
            Reason: {family.rejection_reason}
          </div>
        )}
        <Link
          href={`/admin/registrations/${family.id}`}
          className="text-xs text-krishna-700 underline underline-offset-2 hover:text-krishna-900 mt-1 inline-block"
        >
          View full details →
        </Link>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-start">
        {tab === "Pending" && (
          <>
            {!confirmApprove ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmApprove(true)}
                className="text-sm bg-green-600 hover:bg-green-700 text-white rounded-md px-3 py-2 disabled:opacity-50"
              >
                Approve
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Approve?</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setConfirmApprove(false);
                    onApprove(family.version);
                  }}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white rounded px-2 py-1"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmApprove(false)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            )}

            {!showRejectForm ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowRejectForm(true)}
                className="text-sm border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-md px-3 py-2 disabled:opacity-50"
              >
                Reject
              </button>
            ) : (
              <div className="flex flex-col gap-2 min-w-[220px]">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  maxLength={280}
                  rows={2}
                  placeholder="Reason (optional; 280 chars)"
                  className="text-xs rounded-md border-gray-300 shadow-sm focus:border-rose-400 focus:ring-rose-400"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setShowRejectForm(false);
                      onReject(family.version, rejectReason.trim());
                    }}
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white rounded px-2 py-1"
                  >
                    Confirm reject
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowRejectForm(false)}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "Rejected" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onReopen(family.version)}
            className="text-sm bg-krishna-600 hover:bg-krishna-700 text-white rounded-md px-3 py-2 disabled:opacity-50"
          >
            Reopen
          </button>
        )}

        {tab === "Approved" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  "Move this family back to Rejected? They will lose access until re-approved."
                )
              ) {
                onReject(family.version, "");
              }
            }}
            className="text-sm border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-md px-3 py-2 disabled:opacity-50"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
