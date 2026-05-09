"use client";

// Per-family-member attendance checklist. Rendered on /member for the Primary
// of an Approved family. The Primary ticks who was actually present (all
// checked by default) and one click writes N rows to family_member_attendance.
//
// Contrast with the old single "Mark family attendance" button which wrote
// one coarse row to family_attendance. That path still exists for callers
// that don't pass memberIds, but the Primary-facing UX now defaults to this
// more accurate checklist.

import { useState } from "react";

export type FamilyMemberSummary = {
  id: string;
  displayName: string; // initiated name if present, else given_name
  relationshipLabel: string; // "Primary", "Spouse", "Daughter", etc.
  age: number | null;
  alreadyMarked: boolean;
};

export interface FamilyAttendanceChecklistProps {
  week: number;
  sessionDate: string;
  members: FamilyMemberSummary[];
  todayOverride?: string;
}

function todayInIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function formatPrettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function FamilyAttendanceChecklist({
  week,
  sessionDate,
  members,
  todayOverride,
}: FamilyAttendanceChecklistProps) {
  // Per-member local state: { id → { alreadyMarked, checked, justMarked } }
  const [state, setState] = useState<
    Record<string, { already: boolean; checked: boolean; justMarked: boolean }>
  >(() =>
    Object.fromEntries(
      members.map((m) => [
        m.id,
        {
          already: m.alreadyMarked,
          // Default: all unmarked members checked (Primary presumes everyone was here)
          checked: !m.alreadyMarked,
          justMarked: false,
        },
      ])
    )
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayOverride ?? todayInIST();
  const isToday = today === sessionDate;

  const pending = members.filter((m) => !state[m.id]?.already);
  const anyChecked = pending.some((m) => state[m.id]?.checked);

  if (!isToday) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 bg-gray-100 border border-gray-300 text-gray-600 rounded-md px-4 py-3 text-sm">
        Attendance for Week {week} can only be marked on{" "}
        {formatPrettyDate(sessionDate)}
      </div>
    );
  }

  async function submit() {
    const toMark = pending
      .filter((m) => state[m.id]?.checked)
      .map((m) => m.id);
    if (toMark.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week,
          memberIds: toMark,
          ...(todayOverride ? { today: todayOverride } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      // Mark the just-submitted ones as already-marked in local state
      setState((prev) => {
        const next = { ...prev };
        for (const id of toMark) {
          next[id] = { already: true, checked: false, justMarked: true };
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark attendance.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 bg-white border border-saffron-200 rounded-xl p-4 space-y-3">
      <div className="text-sm text-gray-700">
        Tick the family members who are here today, then press Save.
      </div>
      <ul className="space-y-2">
        {members.map((m) => {
          const s = state[m.id];
          const already = s?.already;
          const justMarked = s?.justMarked;
          return (
            <li key={m.id} className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={already || submitting}
                  checked={!!s?.checked && !already}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      [m.id]: {
                        already: prev[m.id]?.already ?? false,
                        justMarked: prev[m.id]?.justMarked ?? false,
                        checked: e.target.checked,
                      },
                    }))
                  }
                  className="w-5 h-5 rounded border-gray-300 text-krishna-600 focus:ring-saffron-500 disabled:opacity-40"
                />
                <span
                  className={
                    already
                      ? "text-green-700 font-medium line-through decoration-green-300"
                      : "text-gray-800"
                  }
                >
                  {m.displayName}
                  <span className="ml-2 text-xs uppercase tracking-wider text-saffron-700">
                    {m.relationshipLabel}
                  </span>
                  {m.age != null && (
                    <span className="ml-2 text-xs text-gray-500">
                      age {m.age}
                    </span>
                  )}
                </span>
              </label>
              {already && (
                <span className="text-xs text-green-700" aria-label="Already marked present">
                  {justMarked ? "✓ Marked" : "✓ Already present"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-800 rounded-md px-3 py-2 text-xs"
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!anyChecked || submitting}
          className="bg-saffron-500 text-krishna-900 font-semibold px-5 py-2 rounded-md hover:bg-saffron-400 transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krishna-700"
        >
          {submitting
            ? "Saving…"
            : `Save attendance (${
                pending.filter((m) => state[m.id]?.checked).length
              })`}
        </button>
        <button
          type="button"
          onClick={() =>
            setState((prev) => {
              const next = { ...prev };
              for (const m of members) {
                if (!next[m.id]?.already) {
                  next[m.id] = {
                    already: false,
                    justMarked: next[m.id]?.justMarked ?? false,
                    checked: true,
                  };
                }
              }
              return next;
            })
          }
          className="text-xs text-krishna-700 underline underline-offset-2 hover:text-krishna-900"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() =>
            setState((prev) => {
              const next = { ...prev };
              for (const m of members) {
                if (!next[m.id]?.already) {
                  next[m.id] = {
                    already: false,
                    justMarked: next[m.id]?.justMarked ?? false,
                    checked: false,
                  };
                }
              }
              return next;
            })
          }
          className="text-xs text-gray-600 underline underline-offset-2 hover:text-gray-800"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
