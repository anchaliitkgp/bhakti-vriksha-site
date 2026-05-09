// PUT /api/family/[id]
// Primary edit path. Caller must be the Primary of this family OR an
// organiser/manager. Server diffs the submitted body against the current
// snapshot, decides whether the change is material, and calls edit_family.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { roleFor } from "@/lib/auth/roles";
import {
  familyEditBody,
  zodErrorToApiError,
} from "@/lib/family/validation";
import {
  isMaterialChange,
  type FamilySnapshot,
  type MemberSnapshot,
} from "@/lib/family/material-change";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PUT(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized", code: "AUTH" },
      { status: 401 }
    );
  }

  const email = session.user.email.toLowerCase();
  const role = await roleFor(email);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "VALIDATION" },
      { status: 400 }
    );
  }

  const parsed = familyEditBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(zodErrorToApiError(parsed.error), {
      status: 400,
    });
  }
  const body = parsed.data;

  const supabase = supabaseServer();

  // Load current family + primary + secondaries + events
  const { data: family, error: famErr } = await supabase
    .from("families")
    .select("id, primary_email, version, status")
    .eq("id", params.id)
    .maybeSingle();

  if (famErr) {
    console.error("[edit] families fetch failed:", famErr.message);
    return NextResponse.json({ error: famErr.message, code: "SERVER" }, { status: 500 });
  }
  if (!family) {
    return NextResponse.json({ error: "Family not found", code: "VALIDATION" }, { status: 404 });
  }

  // Auth: primary of this family, or org/manager
  const isPrimary = family.primary_email?.toLowerCase() === email;
  const isOrg = role === "organiser" || role === "manager";
  if (!isPrimary && !isOrg) {
    return NextResponse.json(
      { error: "Only the family's primary or an organiser can edit.", code: "AUTH" },
      { status: 403 }
    );
  }

  // Pull all current members + events for the before-snapshot + diff.
  const { data: members } = await supabase
    .from("family_members")
    .select(
      "id, kind, given_name, initiated, initiated_name, relationship, relationship_other, age, gender, marital_status, email, phone"
    )
    .eq("family_id", params.id);

  const { data: events } = await supabase
    .from("family_events")
    .select("family_member_id, kind, event_date")
    .in("family_member_id", (members ?? []).map((m) => m.id));

  const eventByMember = new Map<string, { dob: string | null; ann: string | null }>();
  for (const m of members ?? []) {
    eventByMember.set(m.id, { dob: null, ann: null });
  }
  for (const e of events ?? []) {
    const slot = eventByMember.get(e.family_member_id);
    if (!slot) continue;
    if (e.kind === "DateOfBirth") slot.dob = e.event_date;
    if (e.kind === "WeddingAnniversary") slot.ann = e.event_date;
  }

  const toSnap = (m: any): MemberSnapshot => ({
    id: m.id,
    given_name: m.given_name,
    initiated: m.initiated,
    initiated_name: m.initiated_name,
    age: m.age,
    gender: m.gender,
    marital_status: m.marital_status,
    relationship: m.relationship,
    relationship_other: m.relationship_other ?? null,
    email: m.email ?? null,
    phone: m.phone ?? null,
    date_of_birth: eventByMember.get(m.id)?.dob ?? null,
    wedding_anniversary: eventByMember.get(m.id)?.ann ?? null,
  });

  const primaryMember = (members ?? []).find((m) => m.kind === "Primary");
  if (!primaryMember) {
    return NextResponse.json(
      { error: "Family is missing its primary member.", code: "SERVER" },
      { status: 500 }
    );
  }

  const before: FamilySnapshot = {
    primary: toSnap(primaryMember),
    secondaries: (members ?? []).filter((m) => m.kind === "Secondary").map(toSnap),
  };

  // Build after-snapshot from request body (applying the _op operations).
  const kept = body.secondaries.filter((s) => s._op !== "delete");
  const after: FamilySnapshot = {
    primary: {
      id: body.primary.id,
      given_name: body.primary.given_name,
      initiated: body.primary.initiated,
      initiated_name: body.primary.initiated_name ?? null,
      age: body.primary.age,
      gender: body.primary.gender,
      marital_status: body.primary.marital_status,
      relationship: "Self",
      relationship_other: null,
      email: body.primary.email,
      phone: body.primary.phone,
      date_of_birth: body.primary.date_of_birth ?? null,
      wedding_anniversary: body.primary.wedding_anniversary ?? null,
    },
    secondaries: kept.map((s: any) => ({
      id: s.id ?? "",
      given_name: s.given_name ?? "",
      initiated: !!s.initiated,
      initiated_name: s.initiated_name ?? null,
      age: s.age ?? 0,
      gender: s.gender ?? "Other",
      marital_status: s.marital_status ?? "Single",
      relationship: s.relationship ?? "Other",
      relationship_other: s.relationship_other ?? null,
      email: s.email ?? null,
      phone: s.phone ?? null,
      date_of_birth: s.date_of_birth ?? null,
      wedding_anniversary: s.wedding_anniversary ?? null,
    })),
  };

  // FR-10.4: primary cannot be removed while secondaries exist — always
  // enforced (primary id must match and the body always carries a primary).
  if (body.primary.id !== primaryMember.id) {
    return NextResponse.json(
      { error: "Primary member id does not match the current family.", code: "STATE" },
      { status: 409 }
    );
  }

  // FR-10.3: block any attempt to change the primary email
  if (body.primary.email !== family.primary_email.toLowerCase()) {
    return NextResponse.json(
      { error: "Primary email cannot be changed after registration.", code: "VALIDATION", field: "primary.email" },
      { status: 400 }
    );
  }

  const material = isMaterialChange(before, after);
  if (material && body.consent_if_material !== true) {
    return NextResponse.json(
      {
        error:
          "This change requires you to re-confirm the data-sharing consent at the bottom of the form.",
        code: "VALIDATION",
        field: "consent_if_material",
      },
      { status: 400 }
    );
  }

  // Compute the diff to persist on the audit row.
  const diff = buildDiff(before, after);

  // Resolve actor
  const { data: actor } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!actor?.id) {
    return NextResponse.json(
      { error: "Could not resolve your member record.", code: "SERVER" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase.rpc("edit_family", {
    p_family_id: params.id,
    p_expected_version: body.expectedVersion,
    p_actor_id: actor.id,
    p_body: body,
    p_diff: diff,
  });

  if (error) {
    if (error.code === "P0002" || /stale version/i.test(error.message)) {
      const { data: current } = await supabase
        .from("families")
        .select("version")
        .eq("id", params.id)
        .maybeSingle();
      return NextResponse.json(
        {
          error:
            "This family was just updated elsewhere. Please reload the page and re-apply your edits.",
          code: "CONFLICT",
          version: current?.version,
        },
        { status: 409 }
      );
    }
    if (error.code === "23514") {
      return NextResponse.json(
        { error: error.message, code: "VALIDATION" },
        { status: 400 }
      );
    }
    console.error("[edit] edit_family RPC failed:", error);
    return NextResponse.json(
      { error: error.message, code: "SERVER" },
      { status: 500 }
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(
    { familyId: params.id, version: row?.version ?? body.expectedVersion + 1 },
    { status: 200 }
  );
}

// Build a JSONB-friendly diff for the audit log.
function buildDiff(before: FamilySnapshot, after: FamilySnapshot) {
  const beforeIds = new Set(before.secondaries.map((s) => s.id));
  const afterIds = new Set(after.secondaries.map((s) => s.id).filter(Boolean));

  const added = after.secondaries
    .filter((s) => !s.id || !beforeIds.has(s.id))
    .map((s) => ({
      given_name: s.given_name,
      relationship: s.relationship,
      age: s.age,
    }));
  const removed = before.secondaries
    .filter((s) => !afterIds.has(s.id))
    .map((s) => ({ id: s.id, given_name: s.given_name }));

  const changed: Array<{ id: string; field: string; from: unknown; to: unknown }> = [];

  // Primary changes
  compareMembers(before.primary, after.primary, changed);

  // Kept-secondary changes
  const afterById = new Map(after.secondaries.filter((s) => s.id).map((s) => [s.id, s]));
  for (const b of before.secondaries) {
    const a = afterById.get(b.id);
    if (a) compareMembers(b, a, changed);
  }

  return { added, removed, changed };
}

function compareMembers(
  b: MemberSnapshot,
  a: MemberSnapshot,
  out: Array<{ id: string; field: string; from: unknown; to: unknown }>
) {
  const keys: (keyof MemberSnapshot)[] = [
    "given_name",
    "initiated",
    "initiated_name",
    "age",
    "gender",
    "marital_status",
    "relationship",
    "relationship_other",
    "email",
    "phone",
    "date_of_birth",
    "wedding_anniversary",
  ];
  for (const k of keys) {
    if (b[k] !== a[k]) {
      out.push({ id: b.id || a.id, field: k, from: b[k], to: a[k] });
    }
  }
}
