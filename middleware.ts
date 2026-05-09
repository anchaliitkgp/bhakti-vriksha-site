import { withAuth } from "next-auth/middleware";

// Route guards for member, admin, and family API surfaces.
//
// Behaviour on failure:
// - Unauthenticated requests are redirected to the signIn page.
// - Authenticated-but-wrong-role requests (e.g. a member hitting /admin) also
//   fall through to the signIn redirect. A nicer /403 rewrite is a follow-up.
//
// /register and POST /api/family/register are intentionally NOT guarded —
// anyone can submit a family registration from the public site.
export default withAuth({
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    authorized({ token, req }) {
      const pathname = req.nextUrl.pathname;

      // Admin surfaces (including /admin/registrations and family lifecycle
      // RPC endpoints) require organiser or manager role.
      if (
        pathname.startsWith("/admin") ||
        /^\/api\/family\/[^/]+\/(approve|reject|reopen)$/.test(pathname)
      ) {
        const role = token?.role;
        return role === "organiser" || role === "manager";
      }

      // Family edit endpoint: any signed-in user — the route handler itself
      // enforces "primary of this family OR organiser/manager" (FR-10.1).
      if (/^\/api\/family\/[^/]+$/.test(pathname)) {
        return !!token;
      }

      // Member surfaces + attendance API: any signed-in session.
      if (
        pathname.startsWith("/member") ||
        pathname.startsWith("/api/attendance")
      ) {
        return !!token;
      }

      // Default: signed-in.
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    "/member/:path*",
    "/admin/:path*",
    "/api/attendance/:path*",
    // Family lifecycle endpoints. NOTE: /api/family/register is public and is
    // intentionally excluded — the matcher below excludes it.
    "/api/family/:id((?!register$)[^/]+)",
    "/api/family/:id((?!register$)[^/]+)/approve",
    "/api/family/:id((?!register$)[^/]+)/reject",
    "/api/family/:id((?!register$)[^/]+)/reopen",
  ],
};
