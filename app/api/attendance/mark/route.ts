import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { roleFor } from "@/lib/auth/roles";
import { effectiveTodayIST } from "@/lib/auth/dev-overrides";

export async function POST(req: Request) {
  // 1. Session check (belt-and-suspenders; middleware also guards this route).
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Body parse + validation.
  let week: unknown;
  let todayParam: string | undefined;
  try {
    const body = await req.json();
    week = body?.week;
    // Dev-only: client may pass a simulated today. The server will still
    // validate it against the role allowlist via effectiveTodayIST.
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
  const realRole = roleFor(email);

  const supabase = supabaseServer();

  // 3. Fetch the session row.
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

  // 4. IST date comparison. `effectiveTodayIST` honours a dev-mode override
  // but only when (a) not production and (b) caller is the Website Manager.
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

  // 5. Find member by email (lowercased). Defensive upsert in case signIn
  // callback didn't run (e.g., edge cases where Supabase was unreachable then).
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
          role: roleFor(email),
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

  // 6. Insert attendance row.
  const { error: insertErr } = await supabase.from("attendance").insert({
    member_id: memberId,
    session_week: week,
    marked_by: memberId,
  });

  if (insertErr) {
    // Postgres unique violation — already marked. Treat as success.
    if (insertErr.code === "23505") {
      return NextResponse.json({ ok: true, alreadyMarked: true });
    }
    console.error("[attendance] insert failed:", insertErr.message);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
