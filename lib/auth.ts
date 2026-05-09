import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { roleFor, ROLE_ALLOWLIST } from "@/lib/auth/roles";
import { isApprovedFamilyEmail } from "@/lib/auth/db-allowlist";
import { supabaseServer } from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in `user` is populated; on subsequent requests only
      // `token` carries data forward. Persist role + picture on the token.
      //
      // NOTE: roleFor() is async because it may consult the DB-backed
      // allowlist. This runs once per JWT refresh (typically weekly at our
      // scale given the 30-day JWT lifetime), not per request.
      if (user?.email) {
        token.role = await roleFor(user.email);
      }
      if (user?.image) {
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // id = email (stable enough for our scale; we also have email directly)
        (session.user as typeof session.user & { id?: string }).id =
          session.user.email ?? "";
        // Prefer the cached role on the JWT to avoid a DB round-trip per
        // request. Fall back to resolving only if the token lacks a role.
        session.user.role =
          token.role ?? (await roleFor(session.user.email));
      }
      return session;
    },
    async signIn({ user, account }) {
      // FR-04.2, FR-04.3, FR-04.4 / design §6.2:
      //   Before upserting a members row, gate based on family status:
      //     - In code-allowlist (Manager/Organiser) → always sign in
      //     - families.status = 'Pending'   → redirect to /signin/pending
      //     - families.status = 'Rejected'  → redirect to /signin/rejected
      //     - Approved family (primary OR secondary Gmail) → sign in as member
      //     - No family row and no code-allowlist match   → /signin/unregistered
      //
      // Supabase outages must never block the Manager from signing in. We
      // wrap DB calls in try/catch, fail-open for the code-allowlist path,
      // and fail-closed for non-allowlisted users.
      try {
        if (!user.email) return true;
        const email = user.email.toLowerCase();

        // 1. Code allowlist wins. Upsert + return.
        const hard = ROLE_ALLOWLIST[email];
        if (hard && hard !== "guest") {
          await upsertMemberSafe(user, account, hard);
          return true;
        }

        const supabase = supabaseServer();

        // 2. Check for a family with this primary_email.
        const { data: family, error: famErr } = await supabase
          .from("families")
          .select("status")
          .eq("primary_email", email)
          .maybeSingle();

        if (famErr) {
          console.error("[auth] families lookup failed:", famErr.message);
          // Fail-closed for non-allowlisted users: send to unregistered.
          return "/signin/unregistered";
        }

        if (family?.status === "Pending") return "/signin/pending";
        if (family?.status === "Rejected") return "/signin/rejected";

        // 3. No matching family row. Maybe this is a Secondary with their own
        //    Gmail from an Approved family — check the DB allowlist view.
        if (!family) {
          const approved = await isApprovedFamilyEmail(email);
          if (!approved) return "/signin/unregistered";
        }

        // 4. Approved path. Upsert the members row.
        await upsertMemberSafe(user, account, "member");
        return true;
      } catch (err) {
        console.error("[auth] signIn threw:", err);
        // Fail-closed on unexpected errors.
        return "/signin/unregistered";
      }
    },
  },
};

// ─── helpers ───────────────────────────────────────────────────────────────

async function upsertMemberSafe(
  user: { email?: string | null; name?: string | null },
  account: { providerAccountId?: string } | null,
  role: "member" | "organiser" | "manager"
): Promise<void> {
  try {
    if (!user.email) return;
    const supabase = supabaseServer();
    const email = user.email.toLowerCase();
    const { error } = await supabase.from("members").upsert(
      {
        email,
        name: user.name ?? null,
        google_sub: account?.providerAccountId ?? null,
        role,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "email" }
    );
    if (error) {
      console.error("[auth] members upsert failed:", error.message);
    }
  } catch (err) {
    console.error("[auth] upsertMemberSafe threw:", err);
  }
}
