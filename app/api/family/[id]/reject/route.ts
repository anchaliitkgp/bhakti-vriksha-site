// POST /api/family/[id]/reject
// Role-guarded (organiser|manager). Calls reject_family RPC.

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
      { error: "Only organisers and managers can reject families.", code: "AUTH" },
      { status: 403 }
    );
  }

  let body: { expectedVersion?: number; reason?: string | null };
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

  const reason = body.reason?.trim() ?? null;
  if (reason !== null && reason.length > 280) {
    return NextResponse.json(
      { error: "Reason must be 280 characters or fewer.", code: "VALIDATION", field: "reason" },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  const { data: actor, error: actorErr } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (actorErr || !actor?.id) {
    console.error("[reject] actor lookup failed:", actorErr);
    return NextResponse.json(
      { error: "Could not resolve your member record.", code: "SERVER" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase.rpc("reject_family", {
    p_family_id: params.id,
    p_expected_version: expected,
    p_actor_id: actor.id,
    p_reason: reason,
  });

  if (error) {
    if (error.code === "P0002" || /stale version/i.test(error.message)) {
      const { data: current } = await supabase
        .from("families")
        .select("status, rejected_at, rejected_by, approved_at, approved_by, version")
        .eq("id", params.id)
        .maybeSingle();

      const actorId = current?.rejected_by ?? current?.approved_by;
      let who = "another organiser";
      if (actorId) {
        const { data: other } = await supabase
          .from("members")
          .select("name, email")
          .eq("id", actorId)
          .maybeSingle();
        who = other?.name || other?.email || who;
      }
      const when = (current?.rejected_at ?? current?.approved_at)
        ? new Date((current?.rejected_at ?? current?.approved_at) as string).toLocaleString(
            "en-IN",
            { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }
          )
        : "just now";

      return NextResponse.json(
        {
          error: `This family was just updated by ${who} at ${when} IST.`,
          code: "CONFLICT",
          status: current?.status ?? "Unknown",
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
    console.error("[reject] reject_family RPC failed:", error);
    return NextResponse.json(
      { error: error.message, code: "SERVER" },
      { status: 500 }
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(
    {
      status: "Rejected",
      rejectedAt: row?.rejected_at ?? null,
      rejectedBy: row?.rejected_by ?? actor.id,
      reason: row?.rejection_reason ?? null,
      version: row?.version ?? expected + 1,
    },
    { status: 200 }
  );
}
