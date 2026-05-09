// SERVER-ONLY: consults the Supabase service role.
//
// isApprovedFamilyEmail(email) checks the approved_family_emails view
// (migration 012). Returns true if the email belongs to an Approved family —
// either as the Primary email or as a Secondary with their own Gmail.
//
// This is the DB-backed half of the two-tier allowlist:
//   1. Code allowlist (lib/auth/roles.ts) — hardcoded Manager + Organisers
//   2. DB allowlist (this module)          — auto-extended by /admin/registrations
//
// Called from:
//   - roleFor()            (lib/auth/roles.ts)
//   - signIn callback      (lib/auth.ts)
//
// Failure mode: on DB error we log and return false (fail-closed). This means
// a transient Supabase outage will temporarily bounce registered families to
// /signin/unregistered — but the code-allowlisted Manager + Organisers are
// unaffected because roleFor() short-circuits on the code allowlist first.

import { supabaseServer } from "@/lib/supabase";

export async function isApprovedFamilyEmail(
  email: string | null | undefined
): Promise<boolean> {
  if (!email) return false;
  const normalized = email.toLowerCase();

  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("approved_family_emails")
      .select("email")
      .eq("email", normalized)
      .maybeSingle();

    if (error) {
      console.error(
        "[db-allowlist] approved_family_emails lookup failed:",
        error.message
      );
      return false;
    }
    return !!data;
  } catch (err) {
    console.error("[db-allowlist] threw:", err);
    return false;
  }
}
