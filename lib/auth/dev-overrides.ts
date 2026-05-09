// Dev-mode overrides for testing attendance and roles without waiting for
// Sunday or swapping Google accounts.
//
// Safety rails:
//   1. All overrides are no-ops in production
//      (NODE_ENV=production AND VERCEL_ENV=production).
//   2. The date override is allowed for ANY signed-in user on dev preview
//      + localhost, so cross-role testing (Member / Organiser / Manager)
//      works without switching accounts.
//   3. The role override (?as=) in roles.ts stays Manager-only because
//      impersonation is a stronger-intent action than just time-shifting.
//   4. Only YYYY-MM-DD values are accepted as the date override.

import { type Role } from "./roles";

// Same distinction as lib/auth/roles.ts: Vercel sets NODE_ENV=production
// on preview deployments too, so we must also check VERCEL_ENV.
function isNonProdBuild(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  const vercelEnv = process.env.VERCEL_ENV;
  if (nodeEnv !== "production") return true;
  if (vercelEnv && vercelEnv !== "production") return true;
  return false;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns the "today" date string in IST, honouring a ?today=YYYY-MM-DD
 * query param when allowed.
 *
 * Who can override:
 *   - Production: nobody (real IST date always)
 *   - Dev preview + localhost: any signed-in user
 *   - Anonymous visitors: always real IST date
 */
export function effectiveTodayIST(params: {
  realRole: Role;
  realEmail: string | null | undefined;
  todayParam: string | null | undefined;
}): string {
  const real = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  if (!isNonProdBuild()) return real;
  if (!params.todayParam) return real;
  if (params.realRole === "guest") return real;

  if (!DATE_RE.test(params.todayParam)) return real;

  return params.todayParam;
}

/** True when this request is using a dev date override. */
export function isDateOverridden(params: {
  realRole: Role;
  realEmail: string | null | undefined;
  todayParam: string | null | undefined;
}): boolean {
  return (
    effectiveTodayIST(params) !==
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  );
}
