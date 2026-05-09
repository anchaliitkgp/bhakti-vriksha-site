// Dev-mode overrides for testing attendance and roles without waiting for
// Sunday or swapping Google accounts.
//
// Safety rails:
//   1. All overrides are no-ops in production (`process.env.NODE_ENV === "production"`)
//   2. Only callable by the Website Manager — see `resolveEffectiveRole` /
//      `effectiveTodayIST` below.
//   3. Only YYYY-MM-DD values are accepted as the date override.

import { ROLE_ALLOWLIST, type Role } from "./roles";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns the "today" date string in IST, honouring a ?today=YYYY-MM-DD
 * query param when the caller is the Website Manager in a non-prod build.
 *
 * Anyone else (Members, Organisers, anonymous) always sees the real IST date.
 */
export function effectiveTodayIST(params: {
  realRole: Role;
  realEmail: string | null | undefined;
  todayParam: string | null | undefined;
}): string {
  const real = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  if (process.env.NODE_ENV === "production") return real;
  if (!params.todayParam) return real;
  if (params.realRole !== "manager") return real;

  const normalized = (params.realEmail ?? "").toLowerCase();
  if (ROLE_ALLOWLIST[normalized] !== "manager") return real;

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
