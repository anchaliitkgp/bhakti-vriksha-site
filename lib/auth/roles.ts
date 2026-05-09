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
 * Extra organisers used only in non-production builds — lets us test the
 * Organiser UX on dev / localhost without touching the prod allowlist.
 * These entries are merged into ROLE_ALLOWLIST in non-prod environments.
 */
const DEV_EXTRA_ORGANISERS: Record<string, Role> = {
  "divya.nayak14@gmail.com": "organiser",
  "anchaljbp1986@gmail.com": "organiser",
};

/** True when the current deployment is NOT the real production site.
 *  Vercel sets NODE_ENV=production for every deployment (including Preview)
 *  so we can't use NODE_ENV alone — we fall back to VERCEL_ENV which
 *  distinguishes "production" vs "preview" vs "development". Locally with
 *  `npm run dev` neither var is set so we also treat that as non-prod. */
function isNonProdBuild(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  const vercelEnv = process.env.VERCEL_ENV;
  if (nodeEnv !== "production") return true; // local dev
  if (vercelEnv && vercelEnv !== "production") return true; // Vercel Preview
  return false;
}

/** Resolved allowlist for the current environment (code-level). */
export const EFFECTIVE_ROLE_ALLOWLIST: Record<string, Role> = isNonProdBuild()
  ? { ...ROLE_ALLOWLIST, ...DEV_EXTRA_ORGANISERS }
  : ROLE_ALLOWLIST;

/**
 * Resolve a role for a given email.
 * - null / undefined / empty    → "guest"
 * - email in the allowlist      → that role
 * - any other authenticated user → "member"
 */
export function roleFor(email: string | null | undefined): Role {
  if (!email) return "guest";
  const normalized = email.toLowerCase();
  return EFFECTIVE_ROLE_ALLOWLIST[normalized] ?? "member";
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

  // Never on the real production site. (NODE_ENV alone isn't reliable on
  // Vercel — all builds set NODE_ENV=production. See isNonProdBuild.)
  if (!isNonProdBuild()) return realRole;

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
