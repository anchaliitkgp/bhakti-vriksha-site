"use client";

// Clickable tile for one family member on /admin/attendance.
// Updates ?member=<id> in the URL so the server re-renders the drill-down
// below the grid. Also un-selects (clears ?member) when re-clicked.

import { useRouter, useSearchParams } from "next/navigation";

export interface AdminMemberTileProps {
  memberId: string;
  label: string;
  kind: "Primary" | "Secondary";
  relationship: string;
  attended: number;
  total: number;
  selected: boolean;
}

export default function AdminMemberTile({
  memberId,
  label,
  kind,
  relationship,
  attended,
  total,
  selected,
}: AdminMemberTileProps) {
  const router = useRouter();
  const params = useSearchParams();
  const pct = total === 0 ? 0 : Math.round((attended / total) * 100);

  function onClick() {
    const next = new URLSearchParams(params.toString());
    if (selected) {
      next.delete("member");
    } else {
      next.set("member", memberId);
    }
    router.push(`/admin/attendance?${next.toString()}`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`text-left p-3 border rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 ${
        selected
          ? "bg-krishna-50 border-krishna-400 ring-2 ring-krishna-400"
          : "bg-saffron-50/50 border-saffron-100 hover:bg-saffron-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-krishna-800">{label}</span>
        <span className="text-[10px] uppercase tracking-wider text-saffron-700">
          {kind === "Primary" ? "Primary" : relationship}
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-600">
        {attended} of {total}{" "}
        <span className="text-gray-400">·</span>{" "}
        <span className="font-semibold text-krishna-800">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 bg-saffron-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${selected ? "bg-krishna-500" : "bg-saffron-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {selected && (
        <div className="mt-2 text-[11px] text-krishna-700">
          Showing session-by-session details below
        </div>
      )}
    </button>
  );
}
