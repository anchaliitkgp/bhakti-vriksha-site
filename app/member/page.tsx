import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import AttendanceButton from "@/components/AttendanceButton";
import FamilyAttendanceChecklist, {
  type FamilyMemberSummary,
} from "@/components/FamilyAttendanceChecklist";
import RegisterFamilyBanner from "@/components/RegisterFamilyBanner";
import { resolveEffectiveRole, isRoleOverridden, type Role } from "@/lib/auth/roles";
import { effectiveTodayIST, isDateOverridden } from "@/lib/auth/dev-overrides";

export const metadata: Metadata = {
  title: "Member dashboard · Bhakti Vriksha Radha Madan Mohan",
  description:
    "Your Bhakti Vriksha member dashboard — today's session, attendance, and upcoming Sundays.",
  robots: { index: false, follow: false },
};

type SessionRow = {
  week: number;
  date: string; // YYYY-MM-DD
  title: string;
  category: string;
  suggested_speaker: string | null;
};

function firstName(name?: string | null, email?: string | null): string {
  if (name && name.trim().length > 0) return name.trim().split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "friend";
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

function roleBadgeClasses(role: Role): string {
  switch (role) {
    case "manager":
      return "bg-krishna-700 text-white";
    case "organiser":
      return "bg-krishna-600 text-white";
    default:
      return "bg-saffron-500 text-krishna-900";
  }
}

function roleLabel(role: Role): string {
  switch (role) {
    case "manager":
      return "Website Manager";
    case "organiser":
      return "Organiser";
    case "member":
      return "Member";
    default:
      return "Guest";
  }
}

export default async function MemberDashboard({
  searchParams,
}: {
  searchParams?: { as?: string; today?: string };
}) {
  const session = await getServerSession(authOptions);

  // Middleware should have already redirected anonymous users; this is just a
  // defensive fallback that renders a friendly message rather than crashing.
  if (!session?.user?.email) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-serif text-3xl text-krishna-800">
          Please sign in
        </h1>
        <div className="om-divider mt-3 mb-6" />
        <p className="text-gray-700 mb-6">
          You need to be signed in to view the member dashboard.
        </p>
        <Link
          href="/signin?callbackUrl=%2Fmember"
          className="inline-block bg-saffron-500 text-krishna-900 font-semibold px-5 py-3 rounded-md hover:bg-saffron-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krishna-700"
        >
          Sign in with Google
        </Link>
      </section>
    );
  }

  const email = session.user.email.toLowerCase();
  const realRole: Role = (session.user.role as Role | undefined) ?? "member";
  const role: Role = resolveEffectiveRole({
    realRole,
    realEmail: email,
    asParam: searchParams?.as,
  });
  const roleOverridden = isRoleOverridden({
    realRole,
    realEmail: email,
    asParam: searchParams?.as,
  });
  const today = effectiveTodayIST({
    realRole,
    realEmail: email,
    todayParam: searchParams?.today,
  });
  const dateOverridden = isDateOverridden({
    realRole,
    realEmail: email,
    todayParam: searchParams?.today,
  });
  const supabase = supabaseServer();

  // 1. Member row (for id — needed for attendance lookups).
  const { data: memberRow } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const memberId = memberRow?.id as string | undefined;

  // 1b. Is the signed-in user the Primary of an Approved family?
  //     Also load the full member roster for the per-member attendance
  //     checklist shown below.
  const { data: myFamily } = await supabase
    .from("families")
    .select("id, status")
    .eq("primary_email", email)
    .maybeSingle();

  const isPrimary = !!myFamily;
  const isApprovedPrimary = isPrimary && myFamily?.status === "Approved";
  let familyMemberCount = 1;
  let primaryDisplayName: string | null = null;
  let familyRosterRaw: Array<{
    id: string;
    kind: string;
    given_name: string;
    initiated: boolean;
    initiated_name: string | null;
    relationship: string;
    age: number;
  }> = [];
  if (isPrimary && myFamily?.id) {
    const { data: fmembers } = await supabase
      .from("family_members")
      .select(
        "id, kind, given_name, initiated, initiated_name, relationship, age"
      )
      .eq("family_id", myFamily.id);
    familyRosterRaw = (fmembers as any) ?? [];
    familyMemberCount = familyRosterRaw.length;
    const primary = familyRosterRaw.find((m) => m.kind === "Primary");
    if (primary) {
      primaryDisplayName =
        primary.initiated && primary.initiated_name
          ? String(primary.initiated_name)
          : String(primary.given_name);
    }
  }

  // 1c. Is the signed-in user a Secondary with their own Gmail (matches a
  //     family_members.email row on an Approved family)? If so, the dashboard
  //     offers them a self-only mark — they only see themselves, not the
  //     whole roster.
  let selfFamilyMemberId: string | null = null;
  let selfFamilyId: string | null = null;
  if (!isPrimary) {
    const { data: selfFm } = await supabase
      .from("family_members")
      .select("id, family_id, families!inner(status)")
      .eq("email", email)
      .maybeSingle();
    const fm = selfFm as
      | { id: string; family_id: string; families: { status: string } }
      | null;
    if (fm && fm.families?.status === "Approved") {
      selfFamilyMemberId = fm.id;
      selfFamilyId = fm.family_id;
    }
  }

  // 2. Today's session (if any).
  const { data: todaySessionRaw } = await supabase
    .from("sessions")
    .select("week, date, title, category, suggested_speaker")
    .eq("date", today)
    .maybeSingle();
  const todaySession = todaySessionRaw as SessionRow | null;

  // 3. Upcoming sessions (next 4, starting today or later).
  const { data: upcomingRaw } = await supabase
    .from("sessions")
    .select("week, date, title, category, suggested_speaker")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(4);
  const upcoming = (upcomingRaw ?? []) as SessionRow[];

  // 4. Attendance history for this member. Across all three sources:
  //    - family_member_attendance (granular per-member, new)
  //    - attendance (legacy self)
  //    - family_attendance (legacy coarse family-wide)
  let attendanceCount = 0;
  let recentAttendance: Array<{ session_week: number; marked_at: string }> = [];
  let alreadyMarkedToday = false;

  // Roster + already-marked map for today, used by the checklist UI (primary only)
  const rosterWeekMarked = new Map<string, boolean>(); // family_member_id → already?
  if (todaySession && (isApprovedPrimary || selfFamilyMemberId)) {
    const rosterIds = isApprovedPrimary
      ? familyRosterRaw.map((m) => m.id)
      : selfFamilyMemberId
      ? [selfFamilyMemberId]
      : [];
    if (rosterIds.length > 0) {
      const { data: marks } = await supabase
        .from("family_member_attendance")
        .select("family_member_id")
        .in("family_member_id", rosterIds)
        .eq("session_week", todaySession.week);
      for (const r of (marks as any) ?? []) {
        rosterWeekMarked.set(r.family_member_id, true);
      }
    }
  }

  if (memberId || selfFamilyMemberId || isApprovedPrimary) {
    const selfRows: Array<{ session_week: number; marked_at: string }> = [];
    const coarseFamilyRows: Array<{
      session_week: number;
      marked_at: string;
    }> = [];
    const memberAttendanceRows: Array<{
      session_week: number;
      marked_at: string;
    }> = [];

    if (memberId) {
      const { data: attendanceRows } = await supabase
        .from("attendance")
        .select("session_week, marked_at")
        .eq("member_id", memberId)
        .order("session_week", { ascending: false });
      selfRows.push(...((attendanceRows as any) ?? []));
    }

    if (isApprovedPrimary && myFamily?.id) {
      const { data: famRows } = await supabase
        .from("family_attendance")
        .select("session_week, marked_at")
        .eq("family_id", myFamily.id)
        .order("session_week", { ascending: false });
      coarseFamilyRows.push(...((famRows as any) ?? []));
    }

    // Per-member attendance for "what have I attended"
    if (selfFamilyMemberId) {
      const { data: fmaRows } = await supabase
        .from("family_member_attendance")
        .select("session_week, marked_at")
        .eq("family_member_id", selfFamilyMemberId)
        .order("session_week", { ascending: false });
      memberAttendanceRows.push(...((fmaRows as any) ?? []));
    } else if (isApprovedPrimary && familyRosterRaw.length > 0) {
      // For the primary, "attendance count" represents the primary's own
      // attendance (not family-wide) — find their family_member_id first.
      const primaryFm = familyRosterRaw.find((m) => m.kind === "Primary");
      if (primaryFm) {
        const { data: fmaRows } = await supabase
          .from("family_member_attendance")
          .select("session_week, marked_at")
          .eq("family_member_id", primaryFm.id)
          .order("session_week", { ascending: false });
        memberAttendanceRows.push(...((fmaRows as any) ?? []));
      }
    }

    // Merge by week, keeping earliest marked_at.
    const merged = new Map<number, string>();
    for (const r of [...memberAttendanceRows, ...selfRows, ...coarseFamilyRows]) {
      const prev = merged.get(r.session_week);
      if (!prev || r.marked_at < prev) merged.set(r.session_week, r.marked_at);
    }
    const mergedArr = Array.from(merged.entries())
      .map(([session_week, marked_at]) => ({ session_week, marked_at }))
      .sort((a, b) => b.session_week - a.session_week);

    attendanceCount = mergedArr.length;
    recentAttendance = mergedArr.slice(0, 5);
    if (todaySession) {
      alreadyMarkedToday = mergedArr.some(
        (r) => r.session_week === todaySession.week
      );
    }
  }

  // Total session count for "X of N" message.
  const { count: totalSessionsCountRaw } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true });
  const totalSessions = totalSessionsCountRaw ?? 32;

  // Resolve titles for the recent attendance list.
  let recentWithTitles: Array<{
    week: number;
    date: string;
    title: string;
  }> = [];
  if (recentAttendance.length > 0) {
    const weeks = recentAttendance.map((r) => r.session_week);
    const { data: titleRows } = await supabase
      .from("sessions")
      .select("week, date, title")
      .in("week", weeks);
    const byWeek = new Map(
      (titleRows ?? []).map((r) => [
        r.week as number,
        { date: r.date as string, title: r.title as string },
      ])
    );
    recentWithTitles = recentAttendance
      .map((r) => {
        const match = byWeek.get(r.session_week);
        return {
          week: r.session_week,
          date: match?.date ?? "",
          title: match?.title ?? `Week ${r.session_week}`,
        };
      })
      .filter((r) => r.date !== "");
  }

  // 5. Family history grid (Primary only): for every session that has
  //    passed (date <= today) or is today, which family member attended?
  //    Used by the My Attendance card to show the whole family's history.
  type FamilyHistoryCell = { attended: boolean };
  type FamilyHistoryRow = {
    week: number;
    date: string;
    title: string;
    cells: Record<string, FamilyHistoryCell>; // family_member_id -> cell
  };
  let familyHistory: FamilyHistoryRow[] = [];
  let familyHistoryMembers: Array<{ id: string; label: string }> = [];
  if (isApprovedPrimary && familyRosterRaw.length > 0) {
    // Past + today sessions, ordered newest-first
    const { data: pastSessions } = await supabase
      .from("sessions")
      .select("week, date, title")
      .lte("date", today)
      .order("date", { ascending: false });
    const pastWeeks = (pastSessions ?? []).map((s: any) => s.week as number);

    if (pastWeeks.length > 0) {
      const rosterIds = familyRosterRaw.map((m) => m.id);
      const { data: fmaRows } = await supabase
        .from("family_member_attendance")
        .select("family_member_id, session_week")
        .in("family_member_id", rosterIds)
        .in("session_week", pastWeeks);

      // Family-wide coarse rows (legacy): if family_attendance has a week,
      // we render all members as attended for that week (best we can do
      // given the data we have; the new checklist writes per-member rows).
      const { data: famCoarseRows } = await supabase
        .from("family_attendance")
        .select("session_week")
        .eq("family_id", myFamily!.id)
        .in("session_week", pastWeeks);

      const fmaByWeekMember = new Set<string>();
      for (const r of (fmaRows as any) ?? []) {
        fmaByWeekMember.add(`${r.session_week}|${r.family_member_id}`);
      }
      const coarseWeeks = new Set<number>(
        ((famCoarseRows as any) ?? []).map((r: any) => r.session_week as number)
      );

      familyHistoryMembers = familyRosterRaw
        // Stable order: Primary first, then others by the order they were
        // inserted (approximated by id sort).
        .slice()
        .sort((a, b) => {
          if (a.kind === "Primary" && b.kind !== "Primary") return -1;
          if (a.kind !== "Primary" && b.kind === "Primary") return 1;
          return a.id < b.id ? -1 : 1;
        })
        .map((m) => ({
          id: m.id,
          label:
            m.initiated && m.initiated_name
              ? String(m.initiated_name).split(/\s+/)[0]
              : String(m.given_name).split(/\s+/)[0],
        }));

      familyHistory = ((pastSessions as any) ?? []).map((s: any) => ({
        week: s.week as number,
        date: s.date as string,
        title: s.title as string,
        cells: Object.fromEntries(
          familyHistoryMembers.map((m) => [
            m.id,
            {
              attended:
                fmaByWeekMember.has(`${s.week}|${m.id}`) ||
                coarseWeeks.has(s.week),
            },
          ])
        ),
      }));
    }
  }

  const name = firstName(session.user.name, session.user.email);

  // Build the greeting line per FR-09.
  const greetingName =
    primaryDisplayName && primaryDisplayName.length > 0
      ? primaryDisplayName.split(/\s+/)[0]
      : name;
  const showAndFamily = isApprovedPrimary && familyMemberCount > 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-12">
      {/* 1. Welcome strip */}
      <section className="bg-gradient-to-br from-krishna-700 to-krishna-800 text-white rounded-2xl px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-saffron-200 uppercase tracking-widest text-xs">
              Welcome
            </div>
            <h1 className="font-serif text-2xl md:text-3xl mt-1">
              Hare Krishna, {greetingName}
              {showAndFamily ? " and Family" : ""}!
            </h1>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${roleBadgeClasses(
              role
            )}`}
          >
            {roleLabel(role)}
          </span>
        </div>
      </section>

      {/* Dev-only override banner — visible when using ?as= or ?today= */}
      {(roleOverridden || dateOverridden) && (
        <div className="mt-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg px-4 py-3 text-sm text-yellow-900">
          <div className="font-semibold">⚠ Dev mode — override active</div>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            {roleOverridden && (
              <li>
                Viewing as <b>{roleLabel(role)}</b> (real role:{" "}
                <b>{roleLabel(realRole)}</b>). Add or remove{" "}
                <code className="text-xs">?as=member</code>,{" "}
                <code className="text-xs">?as=organiser</code>, or{" "}
                <code className="text-xs">?as=manager</code>.
              </li>
            )}
            {dateOverridden && (
              <li>
                Today is simulated as <b>{today}</b>. Remove{" "}
                <code className="text-xs">?today=</code> to use real IST date.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Register-your-family nudge for signed-in users without a family row */}
      {!isPrimary && (
        <RegisterFamilyBanner
          kind={
            realRole === "organiser" || realRole === "manager"
              ? "organiser"
              : "member"
          }
        />
      )}

      {/* 2. Today's session block */}
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-krishna-800">Today</h2>
        <div className="om-divider mt-2 mb-4" />
        {todaySession ? (
          <div className="bg-white border border-saffron-200 rounded-2xl p-6 shadow-sm">
            <div className="text-xs uppercase tracking-widest text-saffron-700">
              Week {todaySession.week} · {formatPrettyDate(todaySession.date)}
            </div>
            <div className="font-serif text-xl md:text-2xl text-krishna-800 mt-1">
              {todaySession.title}
            </div>
            {todaySession.category.startsWith("Practical") && (
              <span className="inline-block mt-2 text-[10px] uppercase tracking-widest bg-saffron-500 text-krishna-900 font-semibold rounded-full px-2 py-0.5">
                Practical
              </span>
            )}
            {todaySession.suggested_speaker && (
              <div className="mt-2 text-sm text-gray-600">
                Suggested speaker: {todaySession.suggested_speaker}
              </div>
            )}
            {(() => {
              const checklistMembers: FamilyMemberSummary[] = isApprovedPrimary
                ? familyRosterRaw.map((m) => ({
                    id: m.id,
                    displayName:
                      m.initiated && m.initiated_name
                        ? String(m.initiated_name)
                        : String(m.given_name),
                    relationshipLabel:
                      m.kind === "Primary" ? "Primary" : m.relationship,
                    age: m.age ?? null,
                    alreadyMarked: rosterWeekMarked.get(m.id) === true,
                  }))
                : selfFamilyMemberId
                ? familyRosterRaw
                    .filter((m) => m.id === selfFamilyMemberId)
                    .map((m) => ({
                      id: m.id,
                      displayName:
                        m.initiated && m.initiated_name
                          ? String(m.initiated_name)
                          : String(m.given_name),
                      relationshipLabel: m.relationship,
                      age: m.age ?? null,
                      alreadyMarked: rosterWeekMarked.get(m.id) === true,
                    }))
                : [];

              // Primaries see the full roster; Secondaries-with-own-Gmail
              // see just themselves. Both land in the same checklist UI
              // for a consistent UX.
              if (checklistMembers.length > 0) {
                return (
                  <FamilyAttendanceChecklist
                    week={todaySession.week}
                    sessionDate={todaySession.date}
                    members={checklistMembers}
                    todayOverride={dateOverridden ? today : undefined}
                  />
                );
              }

              // Non-family signed-in users (e.g. code-allowlisted Organisers
              // who haven't registered a family yet) keep the original
              // single self-button path.
              return (
                <AttendanceButton
                  week={todaySession.week}
                  sessionDate={todaySession.date}
                  alreadyMarked={alreadyMarkedToday}
                  todayOverride={dateOverridden ? today : undefined}
                />
              );
            })()}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-gray-700">
            <div className="font-medium">No session today.</div>
            {upcoming.length > 0 ? (
              <div className="mt-2 text-sm">
                Next Sunday: Week {upcoming[0].week} —{" "}
                {formatPrettyDate(upcoming[0].date)} — {upcoming[0].title}
              </div>
            ) : (
              <div className="mt-2 text-sm">
                The 32-week program has finished. Hari bol!
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. My attendance / Family attendance history */}
      <section className="mt-10">
        <h2 className="font-serif text-2xl text-krishna-800">
          {isApprovedPrimary && familyHistoryMembers.length > 1
            ? "Family attendance"
            : "My attendance"}
        </h2>
        <div className="om-divider mt-2 mb-4" />

        {isApprovedPrimary && familyHistory.length > 0 ? (
          <div className="bg-white border border-saffron-100 rounded-2xl p-4 md:p-6 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-saffron-700">
                  <th className="py-2 pr-3 sticky left-0 bg-white">Week</th>
                  <th className="py-2 pr-3 hidden md:table-cell">Date</th>
                  <th className="py-2 pr-3">Session</th>
                  {familyHistoryMembers.map((m) => (
                    <th key={m.id} className="py-2 px-2 text-center">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-saffron-100">
                {familyHistory.map((row) => (
                  <tr key={row.week}>
                    <td className="py-2 pr-3 font-medium text-gray-700 sticky left-0 bg-white">
                      {row.week}
                    </td>
                    <td className="py-2 pr-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                      {formatPrettyDate(row.date)}
                    </td>
                    <td className="py-2 pr-3 text-krishna-800">{row.title}</td>
                    {familyHistoryMembers.map((m) => (
                      <td
                        key={m.id}
                        className="py-2 px-2 text-center"
                        aria-label={
                          row.cells[m.id]?.attended
                            ? `${m.label} attended Week ${row.week}`
                            : `${m.label} did not attend Week ${row.week}`
                        }
                      >
                        {row.cells[m.id]?.attended ? (
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
              ✓ = present. Blank = not marked. Older sessions marked
              family-wide (before per-member checklist) show everyone as
              present for that week.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-saffron-100 rounded-2xl p-6 shadow-sm">
            <div className="text-gray-700">
              You have attended{" "}
              <span className="font-semibold text-krishna-800">
                {attendanceCount}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-krishna-800">
                {totalSessions}
              </span>{" "}
              sessions so far.
            </div>
            {recentWithTitles.length > 0 ? (
              <>
                <div className="mt-4 text-xs uppercase tracking-widest text-saffron-700">
                  Most recent sessions attended
                </div>
                <ul className="mt-2 divide-y divide-saffron-100">
                  {recentWithTitles.map((r) => (
                    <li
                      key={r.week}
                      className="py-2 flex items-baseline gap-3"
                    >
                      <span className="text-sm text-gray-500 w-20 shrink-0">
                        Week {r.week}
                      </span>
                      <span className="text-sm text-gray-500 w-40 shrink-0 hidden sm:block">
                        {formatPrettyDate(r.date)}
                      </span>
                      <span className="text-sm text-krishna-800 font-medium">
                        {r.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                You haven&rsquo;t marked attendance yet. Attendance can only
                be marked on the Sunday of a scheduled session.
              </p>
            )}
          </div>
        )}
      </section>

      {/* 4. Upcoming sessions */}
      <section className="mt-10">
        <h2 className="font-serif text-2xl text-krishna-800">
          Upcoming sessions
        </h2>
        <div className="om-divider mt-2 mb-4" />
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">
            No more sessions scheduled. Hari bol!
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {upcoming.map((s) => {
              const isPractical = s.category.startsWith("Practical");
              return (
                <div
                  key={s.week}
                  className={`rounded-2xl p-5 border shadow-sm ${
                    isPractical
                      ? "bg-saffron-50 border-saffron-200"
                      : "bg-white border-saffron-100"
                  }`}
                >
                  <div className="text-xs uppercase tracking-widest text-saffron-700">
                    Week {s.week} · {formatPrettyDate(s.date)}
                  </div>
                  <div className="font-serif text-lg text-krishna-800 mt-1">
                    {s.title}
                  </div>
                  {isPractical && (
                    <span className="inline-block mt-2 text-[10px] uppercase tracking-widest bg-saffron-500 text-krishna-900 font-semibold rounded-full px-2 py-0.5">
                      Practical
                    </span>
                  )}
                  {s.suggested_speaker && (
                    <div className="mt-2 text-xs text-gray-600">
                      Suggested: {s.suggested_speaker}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Quick links */}
      <section className="mt-12 pt-6 border-t border-saffron-100">
        <div className="text-xs uppercase tracking-widest text-saffron-700 mb-2">
          Quick links
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {isPrimary && (
            <>
              <Link
                href="/member/family/edit"
                className="text-krishna-700 underline underline-offset-4 hover:text-krishna-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
              >
                Edit your family
              </Link>
              <span className="text-gray-300" aria-hidden>
                ·
              </span>
            </>
          )}
          <Link
            href="/curriculum"
            className="text-krishna-700 underline underline-offset-4 hover:text-krishna-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
          >
            Proposed curriculum
          </Link>
          <span className="text-gray-300" aria-hidden>
            ·
          </span>
          <Link
            href="/resources"
            className="text-krishna-700 underline underline-offset-4 hover:text-krishna-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
          >
            Resources
          </Link>
          <span className="text-gray-300" aria-hidden>
            ·
          </span>
          <Link
            href="/contact"
            className="text-krishna-700 underline underline-offset-4 hover:text-krishna-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded"
          >
            Contact
          </Link>
        </div>
      </section>
    </div>
  );
}
