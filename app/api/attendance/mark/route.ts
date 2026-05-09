import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { roleFor } from "@/lib/auth/roles";
import { effectiveTodayIST } from "@/lib/auth/dev-overrides";

// POST /api/attendance/mark
//
// Marks attendance for a Sunday session. Three ways to call it:
//
//   1. { week, memberIds: [uuid, uuid, ...] }
//      Primary marks specific family members present. Each uuid must belong
//      to the caller's family. Writes N rows to family_member_attendance.
//      This is the preferred path for primaries now.
//
//   2. { week, scope: "self" }   (also the default when no body sent)
//      Caller marks their own attendance. If they are part of a family
//      (matched by family_members.email), writes to
//      family_member_attendance. Otherwise writes to the legacy `attendance`.
//
//   3. { week, scope: "family" }   (LEGACY — still works)
//      Primary marks the whole family present at once. Writes a single
//      row to family_attendance. New Primary UI should send memberIds
//      explicitly; this path remains for back-compat.
//
// In all three cases the IST-day guard is authoritative.

export async function POST(req: Request) {
  // 1. Session
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Body
  let week: unknown;
  let scope: "self" | "family" = "self";
  let memberIds: string[] | undefined;
  let todayParam: string | undefined;
  try {
    const body = await req.json();
    week = body?.week;
    if (body?.scope === "family" || body?.scope === "self") scope = body.scope;
    if (Array.isArray(body?.memberIds)) {
      memberIds = body.memberIds.filter((x: unknown) => typeof x === "string");
    }
    if (typeof body?.today === "string") todayParam = body.today;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof week !== "number" || !Number.isInteger(week)) {
    return NextResponse.json(
      { error: "`week` must be an integer" },
      { status: 400 }
    );
  }

  const email = session.user.email.toLowerCase();
  const realRole = await roleFor(email);
  const supabase = supabaseServer();

  // 3. Session row lookup + IST-day guard
  const { data: sessionRow, error: sessionErr } = await supabase
    .from("sessions")
    .select("week, date")
    .eq("week", week)
    .maybeSingle();

  if (sessionErr) {
    console.error("[attendance] session lookup failed:", sessionErr.message);
    return NextResponse.json({ error: sessionErr.message }, { status: 500 });
  }
  if (!sessionRow) {
    return NextResponse.json(
      { error: `No session found for week ${week}` },
      { status: 404 }
    );
  }
  const today = effectiveTodayIST({ realRole, realEmail: email, todayParam });
  if (sessionRow.date !== today) {
    return NextResponse.json(
      {
        error: `Attendance for week ${week} can only be marked on ${sessionRow.date}.`,
      },
      { status: 400 }
    );
  }

  // ─── Branch 1: per-member attendance (memberIds supplied) ───────────
  if (memberIds && memberIds.length > 0) {
    // Caller must be the Primary of the family that owns these members.
    // We fetch each id and check they belong to one family whose primary
    // email matches the caller.
    const { data: rows, error: fmErr } = await supabase
      .from("family_members")
      .select("id, family_id")
      .in("id", memberIds);
    if (fmErr) {
      console.error("[attendance] family_members lookup failed:", fmErr.message);
      return NextResponse.json({ error: fmErr.message }, { status: 500 });
    }
    if (!rows || rows.length !== memberIds.length) {
      return NextResponse.json(
        { error: "One or more family members not found." },
        { status: 400 }
      );
    }
    const familyIds = new Set(rows.map((r: any) => r.family_id));
    if (familyIds.size !== 1) {
      return NextResponse.json(
        { error: "All memberIds must belong to the same family." },
        { status: 400 }
      );
    }
    const familyId = Array.from(familyIds)[0] as string;

    // Owner check: caller primary_email === family.primary_email AND status Approved
    const { data: family, error: famErr } = await supabase
      .from("families")
      .select("status, primary_email")
      .eq("id", familyId)
      .maybeSingle();
    if (famErr || !family) {
      console.error("[attendance] family lookup failed:", famErr?.message);
      return NextResponse.json(
        { error: famErr?.message ?? "Family not found" },
        { status: 500 }
      );
    }
    if (family.status !== "Approved") {
      return NextResponse.json(
        { error: "Family must be Approved to mark attendance." },
        { status: 403 }
      );
    }
    const callerIsPrimary =
      family.primary_email?.toLowerCase() === email;
    if (!callerIsPrimary && realRole !== "organiser" && realRole !== "manager") {
      return NextResponse.json(
        { error: "Only the Primary member (or an organiser) can mark per-member attendance." },
        { status: 403 }
      );
    }

    // Resolve the caller's members.id for marked_by
    const markerId = await ensureMemberId(supabase, email, session.user.name ?? null, realRole);

    // Batch insert — ON CONFLICT DO NOTHING by unique (family_member_id, session_week)
    const inserts = memberIds.map((mid) => ({
      family_member_id: mid,
      session_week: week,
      marked_by: markerId,
    }));
    const { error: insErr } = await supabase
      .from("family_member_attendance")
      .upsert(inserts, {
        onConflict: "family_member_id,session_week",
        ignoreDuplicates: true,
      });
    if (insErr) {
      console.error("[attendance] family_member_attendance insert failed:", insErr.message);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      scope: "member",
      marked: memberIds.length,
    });
  }

  // ─── Branch 2: self-scope ────────────────────────────────────────────
  if (scope === "self") {
    // If caller matches a family_members.email on an Approved family,
    // prefer the granular family_member_attendance table. Otherwise fall
    // back to the legacy `attendance` table (for code-allowlisted users
    // like Organisers who don't have a family row).
    const { data: fmSelf } = await supabase
      .from("family_members")
      .select("id, family_id, families!inner(status)")
      .eq("email", email)
      .maybeSingle();

    const selfFm = fmSelf as
      | { id: string; family_id: string; families: { status: string } }
      | null;

    const markerId = await ensureMemberId(supabase, email, session.user.name ?? null, realRole);

    if (selfFm && selfFm.families?.status === "Approved") {
      const { error: insErr } = await supabase
        .from("family_member_attendance")
        .upsert(
          {
            family_member_id: selfFm.id,
            session_week: week,
            marked_by: markerId,
          },
          {
            onConflict: "family_member_id,session_week",
            ignoreDuplicates: true,
          }
        );
      if (insErr) {
        console.error(
          "[attendance] per-member self insert failed:",
          insErr.message
        );
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, scope: "self_member" });
    }

    // Legacy path: non-family user (Organiser / Manager who hasn't registered)
    const { error: insErr } = await supabase.from("attendance").insert({
      member_id: markerId,
      session_week: week,
      marked_by: markerId,
    });
    if (insErr) {
      if (insErr.code === "23505") {
        return NextResponse.json({ ok: true, alreadyMarked: true, scope: "self" });
      }
      console.error("[attendance] self insert failed:", insErr.message);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, scope: "self" });
  }

  // ─── Branch 3: legacy family-scope (whole family in one row) ─────────
  const { data: family, error: famErr } = await supabase
    .from("families")
    .select("id, status")
    .eq("primary_email", email)
    .eq("status", "Approved")
    .maybeSingle();
  if (famErr) {
    console.error("[attendance] families lookup failed:", famErr.message);
    return NextResponse.json({ error: famErr.message }, { status: 500 });
  }
  if (!family?.id) {
    return NextResponse.json(
      { error: "Family-scope attendance is available to the Primary of an Approved family." },
      { status: 403 }
    );
  }
  const markerId = await ensureMemberId(supabase, email, session.user.name ?? null, realRole);
  const { error: insErr } = await supabase.from("family_attendance").insert({
    family_id: family.id,
    session_week: week,
    marked_by: markerId,
  });
  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ ok: true, alreadyMarked: true, scope: "family" });
    }
    console.error("[attendance] family insert failed:", insErr.message);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, scope: "family" });
}

// ─── Helper: resolve members.id for the signed-in email ────────────────
async function ensureMemberId(
  supabase: ReturnType<typeof supabaseServer>,
  email: string,
  name: string | null,
  role: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: upserted, error: upsertErr } = await supabase
    .from("members")
    .upsert(
      {
        email,
        name,
        role: ["member", "organiser", "manager"].includes(role) ? role : "member",
        last_seen: new Date().toISOString(),
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();
  if (upsertErr || !upserted?.id) {
    throw new Error(upsertErr?.message ?? "Could not create member row");
  }
  return upserted.id as string;
}
