import { withAuth } from "next-auth/middleware";

// Route guards for member and admin surfaces.
//
// Behaviour on failure:
// - Unauthenticated requests are redirected to the signIn page configured below
//   (NextAuth default). That matches our UX.
// - Authenticated-but-wrong-role requests (e.g., a member hitting /admin) also
//   fall through to the signIn redirect today. That's acceptable for the first
//   ship; a nicer /403 rewrite is a follow-up (Group 4+ future work). See the
//   `authorized` callback below for where role checks happen.
export default withAuth({
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    authorized({ token, req }) {
      const pathname = req.nextUrl.pathname;

      // Admin surfaces require organiser or manager role.
      if (pathname.startsWith("/admin")) {
        const role = token?.role;
        return role === "organiser" || role === "manager";
      }

      // Member surfaces and attendance API just require any authenticated
      // session — any signed-in family can mark their own attendance (US-14).
      if (
        pathname.startsWith("/member") ||
        pathname.startsWith("/api/attendance")
      ) {
        return !!token;
      }

      // Anything else handled by this middleware (shouldn't happen given the
      // matcher below) defaults to authenticated-only.
      return !!token;
    },
  },
});

export const config = {
  matcher: ["/member/:path*", "/admin/:path*", "/api/attendance/:path*"],
};
