import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { roleFor } from "@/lib/auth/roles";
import { supabaseServer } from "@/lib/supabase";
import AdminAttendanceFamilyPicker, {
  type AttendanceFamilyOption,
} from "@/components/AdminAttendanceFamilyPicker";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Attendance · Admin · Bhakti Vriksha",
  description:
    "Organiser view of family attendance history across the 32-week programme.",
  robots: { index: false, follow: false },
};

function formatPrettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: { family?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    redirect("/signin?callbackUrl=/admin/attendance");
  const role = await roleFor(session.user.email);
  if (role !== "organiser" && role !== "manager") {
    redirect("/signin?callbackUrl=/admin/attendance");
  }

  const supabase = supabaseServer();
  const today = todayIST();

  // 1. Families dropdown — Approved only, sorted by primary given name.
  const { data: approvedFamilies } = await supabase
    .from("families")
    .select("id, primary_email, status")
    .eq("status", "Approved")
    .order("submitted_at", { ascending: false });

  const approvedIds = (approvedFamilies ?? []).map((f: any) => f.id as string);

  // Fetch each family's Primary name in one batch
  const primaryByFamily = new Map<string, string>();
  if (approvedIds.length > 0) {
    const { data: primaryRows } = await supabase
      .from("family_members")
      .select("family_id, given_name, initiated, initiated_name")
      .in("family_id", approvedIds)
      .eq("kind", "Primary");
    for (const r of (primaryRows as any) ?? []) {
      const display =
        r.initiated && r.initiated_name ? r.initiated_name : r.given_name;
      primaryByFamily.set(r.family_id, String(display));
    }
  }

  const options: AttendanceFamilyOption[] = (approvedFamilies ?? [])
    .map((f: any) => ({
      id: f.id as string,
      label: `${primaryByFamily.get(f.id) ?? "(unnamed)"} — ${f.primary_email}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const selectedId = searchParams.family ?? null;
  const isSelected =
    selectedId !== null && approvedIds.includes(selectedId);

  // 2. If a family is selected, gather the rich view.
  let selection: null | {
    id: string;
    primaryDisplayName: string;
    primaryEmail: string;
    roster: Array<{
      id: string;
      label: string;
      kind: "Primary" | "Secondary";
      relationship: string;
      age: number | null;
      attended: number;
    }>;
    history: Array<{
      week: number;
      date: string;
      title: string;
      cells: Record<string, boolean>;
    }>;
    totalPastSessions: number;
  } = null;

  if (isSelected && selectedId) {
    // Roster
    const { data: roster } = await supabase
      .from("family_members")
      .select("id, kind, given_name, initiated, initiated_name, relationship, age")
      .eq("family_id", selectedId);

    const rosterList = (roster as any[]) ?? [];

    // Past + today sessions
    const { data: pastSessions } = await supabase
      .from("sessions")
      .select("week, date, title")
      .lte("date", today)
      .order("date", { ascending: false });
    const pastWeeks = ((pastSessions as any[]) ?? []).map((s) => s.week as number);

    // Granular per-member attendance
    const rosterIds = rosterList.map((m) => m.id as string);
    const { data: fmaRows } =
      rosterIds.length > 0 && pastWeeks.length > 0
        ? await supabase
            .from("family_member_attendance")
            .select("family_member_id, session_week")
            .in("family_member_id", rosterIds)
            .in("session_week", pastWeeks)
        : { data: [] as any[] };

    // Legacy coarse family_attendance — treat as all-members-present
    const { data: famCoarseRows } =
      pastWeeks.length > 0
        ? await supabase
            .from("family_attendance")
            .select("session_week")
            .eq("family_id", selectedId)
            .in("session_week", pastWeeks)
        : { data: [] as any[] };

    const fmaMarked = new Set<string>(
      ((fmaRows as any[]) ?? []).map(
        (r) => `${r.session_week}|${r.family_member_id}`
      )
    );
    const coarseWeeks = new Set<number>(
      ((famCoarseRows as any[]) ?? []).map((r) => r.session_week as number)
    );

    const perMemberCount = new Map<string, number>();
    for (const m of rosterList) {
      let count = 0;
      for (const w of pastWeeks) {
        if (fmaMarked.has(`${w}|${m.id}`) || coarseWeeks.has(w)) count += 1;
      }
      perMemberCount.set(m.id, count);
    }

    const sortedRoster = rosterList
      .slice()
      .sort((a, b) => {
        if (a.kind === "Primary" && b.kind !== "Primary") return -1;
        if (a.kind !== "Primary" && b.kind === "Primary") return 1;
        return String(a.id).localeCompare(String(b.id));
      });

    const primary = sortedRoster.find((m) => m.kind === "Primary");
    const primaryDisplay =
      primary?.initiated && primary?.initiated_name
        ? String(primary.initiated_name)
        : String(primary?.given_name ?? "Primary");

    selection = {
      id: selectedId,
      primaryDisplayName: primaryDisplay,
      primaryEmail:
        (approvedFamilies ?? []).find((f: any) => f.id === selectedId)
          ?.primary_email ?? "",
      roster: sortedRoster.map((m) => ({
        id: m.id as string,
        label:
          m.initiated && m.initiated_name
            ? String(m.initiated_name).split(/\s+/)[0]
            : String(m.given_name).split(/\s+/)[0],
        kind: m.kind as "Primary" | "Secondary",
        relationship: m.relationship,
        age: (m.age as number) ?? null,
        attended: perMemberCount.get(m.id) ?? 0,
      })),
      history: ((pastSessions as any[]) ?? []).map((s) => ({
        week: s.week as number,
        date: s.date as string,
        title: s.title as string,
        cells: Object.fromEntries(
          sortedRoster.map((m) => [
            m.id as string,
            fmaMarked.has(`${s.week}|${m.id}`) ||
              coarseWeeks.has(s.week as number),
          ])
        ) as Record<string, boolean>,
      })),
      totalPastSessions: pastWeeks.length,
    };
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-krishna-800">
            Attendance
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Organiser view — pick a family to see their full attendance
            history.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs text-krishna-700 underline underline-offset-2 hover:text-krishna-900"
        >
          ← Back to admin
        </Link>
      </div>
      <div className="om-divider mt-2 mb-6" />

      <AdminAttendanceFamilyPicker
        families={options}
        selectedId={selectedId}
      />

      {!selection ? (
        <div className="mt-8 p-6 bg-saffron-50 border border-saffron-200 rounded-2xl text-sm text-gray-700">
          {options.length === 0 ? (
            <>No Approved families yet — nothing to report.</>
          ) : (
            <>Pick a family from the dropdown above to see their attendance history.</>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {/* Headline stats */}
          <div className="bg-white border border-saffron-100 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-saffron-700">
                  Family
                </div>
                <div className="font-serif text-2xl text-krishna-800">
                  {selection.primaryDisplayName} &amp; Family
                </div>
                <div className="text-xs text-gray-500 break-all">
                  {selection.primaryEmail}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-saffron-700">
                  Past sessions so far
                </div>
                <div className="font-serif text-3xl text-krishna-800">
                  {selection.totalPastSessions}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs uppercase tracking-wider text-saffron-700 mb-2">
                Per-member attendance
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selection.roster.map((m) => {
                  const pct =
                    selection!.totalPastSessions === 0
                      ? 0
                      : Math.round(
                          (m.attended / selection!.totalPastSessions) * 100
                        );
                  return (
                    <div
                      key={m.id}
                      className="p-3 bg-saffron-50/50 border border-saffron-100 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-krishna-800">
                          {m.label}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-saffron-700">
                          {m.kind === "Primary" ? "Primary" : m.relationship}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {m.attended} of {selection!.totalPastSessions}{" "}
                        <span className="text-gray-400">·</span>{" "}
                        <span className="font-semibold text-krishna-800">
                          {pct}%
                        </span>
                      </div>
                      {/* simple bar */}
                      <div className="mt-2 h-1.5 bg-saffron-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-saffron-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Week × Member grid */}
          <div className="bg-white border border-saffron-100 rounded-2xl p-4 md:p-6 shadow-sm overflow-x-auto">
            <h2 className="font-serif text-xl text-krishna-800 mb-3">
              Week-by-week history
            </h2>
            {selection.history.length === 0 ? (
              <p className="text-sm text-gray-500">
                No past sessions yet — check back after the first Sunday.
              </p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-saffron-700">
                      <th className="py-2 pr-3 sticky left-0 bg-white">Week</th>
                      <th className="py-2 pr-3 hidden md:table-cell">Date</th>
                      <th className="py-2 pr-3">Session</th>
                      {selection.roster.map((m) => (
                        <th key={m.id} className="py-2 px-2 text-center">
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-saffron-100">
                    {selection.history.map((row) => (
                      <tr key={row.week}>
                        <td className="py-2 pr-3 font-medium text-gray-700 sticky left-0 bg-white">
                          {row.week}
                        </td>
                        <td className="py-2 pr-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                          {formatPrettyDate(row.date)}
                        </td>
                        <td className="py-2 pr-3 text-krishna-800">
                          {row.title}
                        </td>
                        {selection.roster.map((m) => (
                          <td
                            key={m.id}
                            className="py-2 px-2 text-center"
                            aria-label={
                              row.cells[m.id]
                                ? `${m.label} attended Week ${row.week}`
                                : `${m.label} did not attend Week ${row.week}`
                            }
                          >
                            {row.cells[m.id] ? (
                              <span className="text-green-600" aria-hidden>
                                ✓
                              </span>
                            ) : (
                              <span className="text-gray-300" aria-hidden>
                                ·
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-gray-500">
                  ✓ = present. Blank = not marked. Weeks marked family-wide
                  before the per-member checklist landed show everyone as
                  present for that week.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
