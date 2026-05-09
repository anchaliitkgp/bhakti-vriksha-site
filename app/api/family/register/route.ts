// POST /api/family/register
// Public endpoint. Anonymous visitors submit this from /register.
// Middleware must NOT require a session for this route.
//
// Flow:
//   1. Parse + validate body with Zod
//   2. Call register_family RPC — atomic insert across families +
//      family_members + family_events + Create audit row
//   3. Map 23505 primary_email unique-violation → 409
//
// Errors follow the shape in design §7.7: { error, code, field? }

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import {
  familyRegisterBody,
  zodErrorToApiError,
} from "@/lib/family/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 1. Parse JSON
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "VALIDATION", field: null },
      { status: 400 }
    );
  }

  // 2. Validate shape + business rules
  const parsed = familyRegisterBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(zodErrorToApiError(parsed.error), {
      status: 400,
    });
  }
  const body = parsed.data;

  // 3. Call RPC. Postgres errors surface as PostgREST error shapes.
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("register_family", {
    p_body: body,
    p_actor_email: body.primary.email,
  });

  if (error) {
    // Primary email duplicate → 409 with a friendly pointer
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "A family is already registered with this primary email. If you think this is wrong, please reach out on the Contact page.",
          code: "CONFLICT",
          field: "primary.email",
        },
        { status: 409 }
      );
    }
    // CHECK constraint violations (consent, minor-married, etc.) → 400.
    // The Zod layer catches most of these, but a direct-API caller can
    // still trigger them.
    if (error.code === "23514") {
      return NextResponse.json(
        {
          error: "One or more values violate a family constraint.",
          code: "VALIDATION",
          field: null,
        },
        { status: 400 }
      );
    }
    console.error("[register] register_family RPC failed:", error);
    return NextResponse.json(
      { error: "Could not complete registration. Please try again.", code: "SERVER", field: null },
      { status: 500 }
    );
  }

  // RPC returns the new family id as a UUID scalar
  const familyId = typeof data === "string" ? data : String(data ?? "");
  return NextResponse.json(
    { familyId, status: "Pending" },
    { status: 201 }
  );
}
