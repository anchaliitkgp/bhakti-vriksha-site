// POST /api/family/[id]/approve
// Role-guarded by middleware (organiser|manager). Defence-in-depth inside.
// Calls approve_family RPC (migration 013) with optimistic versioning.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { roleFor } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized", code: "AUTH" },
      { status: 401 }
    );
  }

  const email = session.user.email.toLowerCase();
  const role = await roleFor(email);
  if (role !== "organiser" && role !== "manager") {
    return NextResponse.json(
      { error: "Only organisers and managers can approve families.", code: "AUTH" },
      { status: 403 }
    );
  }

  let body: { expectedVersion?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "VALIDATION" },
      { status: 400 }
    );
  }

  const expected = body?.expectedVersion;
  if (typeof expected !== "number" || !Number.isInteger(expected) || expected < 1) {
    return NextResponse.json(
      { error: "`expectedVersion` must be a positive integer.", code: "VALIDATION", field: "expectedVersion" },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  // Look up the actor's members row so the RPC can record it.
  const { data: actor, error: actorErr } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (actorErr || !actor?.id) {
    console.error("[approve] actor lookup failed:", actorErr);
    return NextResponse.json(
      { error: "Could not resolve your member record.", code: "SERVER" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase.rpc("approve_family", {
    p_family_id: params.id,
    p_expected_version: expected,
    p_actor_id: actor.id,
  });

  if (error) {
    // Optimistic-concurrency loss — another organiser already acted.
    if (error.code === "P0002" || /stale version/i.test(error.message)) {
      // Fetch the current row so we can give the client a human-readable message.
      const { data: current } = await supabase
        .from("families")
        .select("status, approved_at, approved_by, version")
        .eq("id", params.id)
        .maybeSingle();

      let who = "another organiser";
      if (current?.approved_by) {
        const { data: approver } = await supabase
          .from("members")
          .select("name, email")
          .eq("id", current.approved_by)
          .maybeSingle();
        who = approver?.name || approver?.email || who;
      }
      const when = current?.approved_at
        ? new Date(current.approved_at).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "just now";

      return NextResponse.json(
        {
          error: `Already approved by ${who} at ${when} IST.`,
          code: "CONFLICT",
          status: current?.status ?? "Approved",
          version: current?.version,
        },
        { status: 409 }
      );
    }
    if (error.code === "23514" || /Illegal family.status transition/.test(error.message)) {
      return NextResponse.json(
        { error: error.message, code: "STATE" },
        { status: 409 }
      );
    }
    console.error("[approve] approve_family RPC failed:", error);
    return NextResponse.json(
      { error: error.message, code: "SERVER" },
      { status: 500 }
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(
    {
      status: "Approved",
      approvedAt: row?.approved_at ?? null,
      approvedBy: row?.approved_by ?? actor.id,
      version: row?.version ?? expected + 1,
    },
    { status: 200 }
  );
}
