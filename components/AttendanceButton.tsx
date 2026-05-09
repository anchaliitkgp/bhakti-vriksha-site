"use client";

import { useState } from "react";

type Props = {
  week: number;
  sessionDate: string; // ISO YYYY-MM-DD
  alreadyMarked: boolean;
  /** "self" (default) — write to `attendance`; "family" — write to `family_attendance` via the same endpoint. */
  scope?: "self" | "family";
  /** Dev-only: simulate today's date for UI testing. Server still validates. */
  todayOverride?: string;
};

/**
 * Compute today's date in IST as YYYY-MM-DD using `en-CA` locale
 * (en-CA renders dates as YYYY-MM-DD which matches our session.date format).
 */
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

export default function AttendanceButton({
  week,
  sessionDate,
  alreadyMarked,
  scope = "self",
  todayOverride,
}: Props) {
  const [confirmed, setConfirmed] = useState(alreadyMarked);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayOverride ?? todayInIST();
  const isToday = today === sessionDate;
  const isFamily = scope === "family";

  if (confirmed) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-4 inline-flex items-center gap-2 bg-green-50 border border-green-300 text-green-800 font-medium rounded-md px-4 py-3"
      >
        <span aria-hidden>✅</span>
        {isFamily
          ? `Family attendance confirmed for Week ${week}`
          : `Attendance confirmed for Week ${week}`}
      </div>
    );
  }

  if (!isToday) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 bg-gray-100 border border-gray-300 text-gray-600 rounded-md px-4 py-3 text-sm">
        Attendance for Week {week} can only be marked on{" "}
        {formatPrettyDate(sessionDate)}
      </div>
    );
  }

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week,
          scope,
          ...(todayOverride ? { today: todayOverride } : {}),
        }),
      });
      if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
          else if (body?.message) msg = body.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      setConfirmed(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not mark attendance.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="inline-flex items-center gap-2 bg-saffron-500 text-krishna-900 font-semibold px-6 py-3 rounded-md hover:bg-saffron-400 transition disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krishna-700"
      >
        {submitting
          ? "Marking…"
          : isFamily
          ? `Mark family attendance for Week ${week}`
          : `Mark attendance for Week ${week}`}
      </button>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-3 bg-red-50 border border-red-300 text-red-800 rounded-md px-4 py-3 text-sm"
        >
          <div className="font-medium">Could not mark attendance</div>
          <div className="mt-1">{error}</div>
          <button
            type="button"
            onClick={handleClick}
            className="mt-2 underline text-red-900 hover:text-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
