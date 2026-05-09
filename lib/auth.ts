import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { roleFor } from "@/lib/auth/roles";
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
      if (user?.email) {
        token.role = roleFor(user.email);
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
        session.user.role = token.role ?? roleFor(session.user.email);
      }
      return session;
    },
    async signIn({ user, account }) {
      // Upsert a members row on every sign-in. Failures here must NOT block
      // sign-in — we log and allow the session through.
      try {
        if (!user.email) return true;
        const supabase = supabaseServer();
        const email = user.email.toLowerCase();
        const { error } = await supabase.from("members").upsert(
          {
            email,
            name: user.name ?? null,
            google_sub: account?.providerAccountId ?? null,
            role: roleFor(email),
            last_seen: new Date().toISOString(),
          },
          { onConflict: "email" }
        );
        if (error) {
          console.error("[auth] members upsert failed:", error.message);
        }
      } catch (err) {
        console.error("[auth] signIn upsert threw:", err);
      }
      return true;
    },
  },
};
