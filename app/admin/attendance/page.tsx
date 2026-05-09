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
import AdminMemberTile from "@/components/AdminMemberTile";
import { effectiveTodayIST, isDateOverridden } from "@/lib/auth/dev-overrides";

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

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: { family?: string; member?: string; today?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    redirect("/signin?callbackUrl=/admin/attendance");
  const role = await roleFor(session.user.email);
  if (role !== "organiser" && role !== "manager") {
    redirect("/signin?callbackUrl=/admin/attendance");
  }

  const supabase = supabaseServer();
  // Honour the same ?today= dev-only override used on /member so admins can
  // inspect future-dated test attendance during dev work. On prod this
  // always returns the real IST date.
  const today = effectiveTodayIST({
    realRole: role,
    realEmail: session.user.email.toLowerCase(),
    todayParam: searchParams?.today,
  });
  const dateOverridden = isDateOverridden({
    realRole: role,
    realEmail: session.user.email.toLowerCase(),
    todayParam: searchParams?.today,
  });

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

  const selectedMemberId = searchParams.member ?? null;

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

  // Resolve the per-member drill-down, if a valid ?member= is selected.
  const selectedMember =
    selection && selectedMemberId
      ? selection.roster.find((m) => m.id === selectedMemberId) ?? null
      : null;

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

      {dateOverridden && (
        <div className="mb-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg px-4 py-3 text-sm text-yellow-900">
          ⚠ Dev mode — today is simulated as <b>{today}</b>. Remove{" "}
          <code className="text-xs">?today=</code> to use real IST date.
        </div>
      )}

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
                Per-member attendance — click a card to see session details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selection.roster.map((m) => (
                  <AdminMemberTile
                    key={m.id}
                    memberId={m.id}
                    label={m.label}
                    kind={m.kind}
                    relationship={m.relationship}
                    attended={m.attended}
                    total={selection!.totalPastSessions}
                    selected={selectedMemberId === m.id}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Per-member drill-down (only when a tile is selected) */}
          {selectedMember && (
            <div className="bg-white border border-krishna-200 rounded-2xl p-4 md:p-6 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-krishna-700">
                    Session-by-session —{" "}
                    {selectedMember.kind === "Primary"
                      ? "Primary"
                      : selectedMember.relationship}
                  </div>
                  <h2 className="font-serif text-xl text-krishna-800">
                    {selectedMember.label}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-krishna-700">
                    Attended
                  </div>
                  <div className="font-serif text-2xl text-krishna-800">
                    {selectedMember.attended} / {selection.totalPastSessions}
                  </div>
                </div>
              </div>

              {selection.history.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  No past sessions yet — check back after the first Sunday.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-saffron-100">
                  {selection.history.map((row) => {
                    const attended = row.cells[selectedMember.id];
                    return (
                      <li
                        key={row.week}
                        className={`py-2 flex items-center gap-3 text-sm ${
                          attended ? "" : "opacity-80"
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                            attended
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                          aria-label={attended ? "Attended" : "Not marked"}
                        >
                          {attended ? "✓" : "·"}
                        </span>
                        <span className="w-16 shrink-0 text-gray-500">
                          Week {row.week}
                        </span>
                        <span className="w-40 shrink-0 hidden sm:block text-gray-500 whitespace-nowrap">
                          {formatPrettyDate(row.date)}
                        </span>
                        <span
                          className={
                            attended
                              ? "text-krishna-800 font-medium"
                              : "text-gray-600"
                          }
                        >
                          {row.title}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

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
