import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { roleFor } from "@/lib/auth/roles";
import { effectiveTodayIST } from "@/lib/auth/dev-overrides";

// Marks attendance for the caller, either as a self-mark (default) or at the
// family level when scope = "family". Family scope requires the caller to be
// the Primary of an Approved family.
//
// Body: { week: number, scope?: "self" | "family", today?: string }
//
// Design §7.6, D6 — single endpoint, branches by scope inside. Keeps the
// IST-day guard + session lookup + role resolution in one place.

export async function POST(req: Request) {
  // 1. Session check
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Body parse + basic validation
  let week: unknown;
  let scope: "self" | "family" = "self";
  let todayParam: string | undefined;
  try {
    const body = await req.json();
    week = body?.week;
    if (body?.scope === "family" || body?.scope === "self") scope = body.scope;
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

  // 3. Fetch the session row
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

  // 4. IST date guard (FR-08.7, parent spec)
  const today = effectiveTodayIST({
    realRole,
    realEmail: email,
    todayParam,
  });
  if (sessionRow.date !== today) {
    return NextResponse.json(
      {
        error: `Attendance for week ${week} can only be marked on ${sessionRow.date}.`,
      },
      { status: 400 }
    );
  }

  // ─── Branch A: Family-scope mark ─────────────────────────────────────
  if (scope === "family") {
    // FR-08.6: caller must be the Primary of an Approved family.
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
        {
          error:
            "Family-scope attendance is available to the Primary of an Approved family.",
        },
        { status: 403 }
      );
    }

    // Look up (or lazily create) a members row so marked_by is captured.
    let { data: memberRow } = await supabase
      .from("members")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    let memberId = memberRow?.id as string | undefined;
    if (!memberId) {
      const { data: upserted, error: upsertErr } = await supabase
        .from("members")
        .upsert(
          {
            email,
            name: session.user.name ?? null,
            role: await roleFor(email),
            last_seen: new Date().toISOString(),
          },
          { onConflict: "email" }
        )
        .select("id")
        .single();
      if (upsertErr || !upserted?.id) {
        console.error("[attendance] members upsert failed:", upsertErr);
        return NextResponse.json(
          { error: upsertErr?.message ?? "Could not create member row" },
          { status: 500 }
        );
      }
      memberId = upserted.id;
    }

    const { error: insertErr } = await supabase
      .from("family_attendance")
      .insert({
        family_id: family.id,
        session_week: week,
        marked_by: memberId,
      });

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({
          ok: true,
          alreadyMarked: true,
          scope: "family",
        });
      }
      console.error("[attendance] family_attendance insert failed:", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, scope: "family" });
  }

  // ─── Branch B: Self-scope mark (unchanged behaviour) ─────────────────
  const { data: existingMember, error: memberErr } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (memberErr) {
    console.error("[attendance] member lookup failed:", memberErr.message);
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  let memberId = existingMember?.id as string | undefined;
  if (!memberId) {
    const { data: upserted, error: upsertErr } = await supabase
      .from("members")
      .upsert(
        {
          email,
          name: session.user.name ?? null,
          role: await roleFor(email),
          last_seen: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (upsertErr || !upserted?.id) {
      console.error(
        "[attendance] member upsert failed:",
        upsertErr?.message ?? "no id returned"
      );
      return NextResponse.json(
        { error: upsertErr?.message ?? "Could not create member row" },
        { status: 500 }
      );
    }
    memberId = upserted.id;
  }

  const { error: insertErr } = await supabase.from("attendance").insert({
    member_id: memberId,
    session_week: week,
    marked_by: memberId,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ ok: true, alreadyMarked: true, scope: "self" });
    }
    console.error("[attendance] insert failed:", insertErr.message);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scope: "self" });
}
