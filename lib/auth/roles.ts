// Role allowlist for Bhakti Vriksha members.
// Any authenticated Google user not in the allowlist falls through to "member".

export type Role = "guest" | "member" | "organiser" | "manager";

export const ROLE_ALLOWLIST: Record<string, Role> = {
  // Website Manager
  "anchaliitkgp@gmail.com": "manager",
  // Organisers
  "mahendra.prajapat@gmail.com": "organiser",
  // TODO: add vinita mataji's email when provided
};

/**
 * Resolve a role for a given email.
 * - null / undefined / empty    → "guest"
 * - email in the allowlist      → that role
 * - any other authenticated user → "member"
 */
export function roleFor(email: string | null | undefined): Role {
  if (!email) return "guest";
  const normalized = email.toLowerCase();
  return ROLE_ALLOWLIST[normalized] ?? "member";
}

// ─── Dev role override ─────────────────────────────────────────────────────
// Lets the Website Manager test different role experiences without signing
// out. Read from the `as` query param: /member?as=member, /admin?as=organiser.
// Safety rails:
//  1. Only active when NODE_ENV !== "production"
//  2. Only active when the signed-in email is in the ROLE_ALLOWLIST with
//     role "manager" (i.e. only *you* can use it)
//  3. "as" must be a valid role (member / organiser / manager)
// Anyone else visiting with `?as=...` is ignored; their real role stands.

const VALID_ROLES = new Set<Role>(["member", "organiser", "manager"]);

export function resolveEffectiveRole(params: {
  realRole: Role;
  realEmail: string | null | undefined;
  asParam: string | null | undefined;
}): Role {
  const { realRole, realEmail, asParam } = params;

  // Never in production.
  if (process.env.NODE_ENV === "production") return realRole;

  // No override requested.
  if (!asParam) return realRole;

  // Only the Website Manager can impersonate.
  if (realRole !== "manager") return realRole;

  // Defense in depth: also require the email to be in the allowlist as manager.
  const normalized = (realEmail ?? "").toLowerCase();
  if (ROLE_ALLOWLIST[normalized] !== "manager") return realRole;

  // Sanity-check the target role.
  const target = asParam.toLowerCase() as Role;
  if (!VALID_ROLES.has(target)) return realRole;

  return target;
}

/** True when this request is using a dev role override. */
export function isRoleOverridden(params: {
  realRole: Role;
  realEmail: string | null | undefined;
  asParam: string | null | undefined;
}): boolean {
  return resolveEffectiveRole(params) !== params.realRole;
}
