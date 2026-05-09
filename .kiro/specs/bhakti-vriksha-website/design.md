# Design — Bhakti Vriksha Radha Madan Mohan Website

**Status:** Draft v1 (lean — optimized for today's Option A ship)
**Owner:** Anchal Nema
**Last updated:** 2026-05-09

---

## 1. Scope of this design

Covers today's build (Option A): Phase 1 public polish + Phase 2 Google OAuth + Member self-attendance + role-guarded admin shell. Organiser tooling (curriculum editor, announcements, roster) is designed enough to validate the data model but implementation is deferred.

## 2. Technology stack

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | 14.2.33 |
| Language | TypeScript strict | 5.5.3 |
| Styling | Tailwind CSS | 3.4.6 |
| Auth | NextAuth.js (Auth.js v4 for stability with Next 14) | ^4.24 |
| Auth provider | Google OAuth 2.0 | — |
| Database | Supabase Postgres (free tier) | — |
| DB client | `@supabase/supabase-js` | ^2.x |
| Hosting | Vercel free tier | — |
| Source control | GitHub (SSH) | — |
| Analytics (optional) | Vercel Web Analytics | — |

**Why NextAuth v4, not v5 (Auth.js):** v5 is still labeled beta for App Router at this writing, and today is not the day to debug beta auth. v4 has a well-trodden path with Next 14.

## 3. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│  • Public pages (SSG)                                        │
│  • /signin — NextAuth Google button                          │
│  • /member  — SSR, reads session + DB                        │
│  • /admin   — SSR, role-gated                                │
└─────────────────────────────────────────────────────────────┘
             │                     │
             ▼                     ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│ Vercel (Next.js)     │    │ Google OAuth                 │
│  • Static HTML        │───▶│  consent + id_token          │
│  • API route handlers │◀───│                              │
│  • Middleware guards  │    └──────────────────────────────┘
└──────────────────────┘
             │
             ▼
┌──────────────────────────────┐
│ Supabase (Postgres)          │
│  sessions, members, attendance│
└──────────────────────────────┘
```

**Request paths:**
- **Public page view**: Browser → Vercel CDN (cached static HTML). No auth. No DB read.
- **Sign-in**: Browser → `/api/auth/signin` → Google consent → `/api/auth/callback/google` → NextAuth writes a signed JWT cookie → redirect to `/member`.
- **Member dashboard view**: Browser → Vercel SSR → read cookie → call DB via Supabase service role (server-side only) → render HTML.
- **Mark attendance**: Browser submits form → `/api/attendance/mark` (Next.js Route Handler) → validate session+date+role → insert row → return JSON.

## 4. Auth model

### 4.1 Sign-in flow
Standard NextAuth Google provider. Sessions stored as JWT in httpOnly cookie. No DB `sessions` table needed (we use stateless JWT).

```ts
// lib/auth.ts (NextAuth config)
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});
```

### 4.2 Role assignment

Hard-coded allowlist in `lib/auth/roles.ts`. Any authenticated user not listed is treated as a Member.

```ts
// lib/auth/roles.ts
export type Role = "guest" | "member" | "organiser" | "manager";

const ALLOWLIST: Record<string, Role> = {
  // Website Manager
  "anchaliitkgp@gmail.com": "manager",
  // Organisers
  "mahendra.prajapat@gmail.com": "organiser",
  "vinita.prajapat@gmail.com" : "organiser"
};

export function roleFor(email: string | null | undefined): Role {
  if (!email) return "guest";
  return ALLOWLIST[email.toLowerCase()] ?? "member";
}
```

The role is attached to the NextAuth session on each sign-in so we don't re-lookup on every request:

```ts
// NextAuth callbacks
callbacks: {
  jwt({ token, user }) {
    if (user?.email) token.role = roleFor(user.email);
    return token;
  },
  session({ session, token }) {
    (session.user as any).role = token.role;
    return session;
  },
}
```

### 4.3 Route guards

**Middleware** (`middleware.ts`) protects routes at the edge:

```ts
export function middleware(req) {
  const { nextUrl, auth } = req; // auth = NextAuth v5 style; v4 uses withAuth wrapper
  const path = nextUrl.pathname;

  if (path.startsWith("/member") && !auth) return NextResponse.redirect("/signin");
  if (path.startsWith("/admin")) {
    if (!auth) return NextResponse.redirect("/signin");
    if (!["organiser", "manager"].includes(auth.user.role))
      return NextResponse.rewrite(new URL("/403", req.url));
  }
  return NextResponse.next();
}
```

For NextAuth v4, use `withAuth` in `middleware.ts` with a custom `authorized` callback.

### 4.4 Sign-out

Single "Sign out" link in the navbar that calls `signOut({ callbackUrl: "/" })`.

## 5. Data model

### 5.1 `sessions` (curriculum)

Mirrors `data/schedule.ts` but DB-backed so Organisers can edit it later (Phase 2 next weekend).

```sql
CREATE TABLE sessions (
  week           INT PRIMARY KEY,
  date           DATE NOT NULL UNIQUE,
  category       TEXT NOT NULL CHECK (category IN ('Gita / Core', 'Practical (HG Radheshyam Prabhu)')),
  title          TEXT NOT NULL,
  suggested_level TEXT,
  suggested_speaker TEXT,
  notes          TEXT,
  updated_at     TIMESTAMPTZ DEFAULT now()
);
```

Seed on first deploy from the current `data/schedule.ts`. For today's ship, the public `/curriculum` page **continues to read from the TS file** (no DB round-trip, keeps it fast and cached). The DB table is prepared for next weekend's Organiser editor.

### 5.2 `members`

One row per signed-in user. Created/updated on every sign-in.

```sql
CREATE TABLE members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  google_sub  TEXT UNIQUE,
  role        TEXT NOT NULL DEFAULT 'member',
  first_seen  TIMESTAMPTZ DEFAULT now(),
  last_seen   TIMESTAMPTZ DEFAULT now()
);
```

Written by a NextAuth `signIn` or `jwt` callback using an upsert:

```ts
await supabase.from("members").upsert({
  email, name, google_sub, role: roleFor(email), last_seen: new Date()
}, { onConflict: "email" });
```

### 5.3 `attendance`

One row per (member, session). Unique constraint prevents duplicate marks.

```sql
CREATE TABLE attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID REFERENCES members(id) ON DELETE CASCADE,
  session_week INT REFERENCES sessions(week),
  marked_at    TIMESTAMPTZ DEFAULT now(),
  marked_by    UUID REFERENCES members(id), -- for Organiser-on-behalf later
  UNIQUE (member_id, session_week)
);

CREATE INDEX idx_attendance_member ON attendance(member_id);
CREATE INDEX idx_attendance_session ON attendance(session_week);
```

### 5.4 `announcements` (stub for next weekend)

```sql
CREATE TABLE announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body        TEXT NOT NULL CHECK (length(body) <= 280),
  starts_on   DATE NOT NULL,
  ends_on     DATE NOT NULL,
  created_by  UUID REFERENCES members(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

Table exists from day one; editor UI comes later.

### 5.5 Supabase RLS (Row-Level Security)

Even with service-role access from the server, we enforce RLS for defense in depth:

```sql
-- members: a user can read their own row; organisers/manager read all
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own" ON members
  FOR SELECT USING (email = auth.jwt() ->> 'email');
CREATE POLICY "organisers read all members" ON members
  FOR SELECT USING (
    coalesce(auth.jwt() ->> 'role', 'guest') IN ('organiser', 'manager')
  );

-- attendance: members write their own; organisers read all
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member writes own attendance" ON attendance
  FOR INSERT WITH CHECK (
    member_id = (SELECT id FROM members WHERE email = auth.jwt() ->> 'email')
  );
CREATE POLICY "member reads own attendance" ON attendance
  FOR SELECT USING (
    member_id = (SELECT id FROM members WHERE email = auth.jwt() ->> 'email')
  );
CREATE POLICY "organisers read all attendance" ON attendance
  FOR SELECT USING (
    coalesce(auth.jwt() ->> 'role', 'guest') IN ('organiser', 'manager')
  );
```

**For today's ship**: we use the service-role key from Next.js server only, bypassing RLS. RLS policies are written and enabled but our writes happen through trusted server code. This means less to debug on day-1 auth.

## 6. Attendance — the "day-of only" rule

The single most important piece of logic today.

### 6.1 UX
- On `/member`, the page determines today's date in **IST (Asia/Kolkata)**.
- If today matches a `sessions.date`, show a big button **"Mark attendance for week N — [session title]"**. On click, POST to `/api/attendance/mark`.
- Otherwise show a grey disabled box: "Attendance for week N can only be marked on Sunday DD Mon YYYY."
- After marking, show "✅ Attendance confirmed for today" and disable the button for the rest of the day.

### 6.2 Server validation
The API endpoint re-validates (never trust the client):

```ts
// POST /api/attendance/mark
// Body: { week: number }
async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { week } = await req.json();

  // Fetch the session row
  const { data: s } = await supabase.from("sessions").select("date").eq("week", week).single();
  if (!s) return new Response("Unknown session", { status: 404 });

  // "Today" in IST
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  if (s.date !== today) {
    return new Response(`Attendance for week ${week} can only be marked on ${s.date}`, { status: 400 });
  }

  // Find member
  const { data: member } = await supabase.from("members").select("id").eq("email", session.user.email).single();

  // Insert (unique constraint prevents duplicates)
  const { error } = await supabase.from("attendance").insert({
    member_id: member.id,
    session_week: week,
    marked_by: member.id,
  });
  if (error && error.code !== "23505") return new Response(error.message, { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
```

### 6.3 Timezone note
All sessions are Sunday in IST. The server uses `toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })` which emits `YYYY-MM-DD` in IST regardless of the Vercel host timezone (which is UTC). No user input needed.

## 7. File / folder structure (additions to the existing repo)

```
bhakti-vriksha-site/
├── app/
│   ├── (public)/                     # existing public pages live here
│   │   └── ...                       # no route change, just organization
│   ├── signin/page.tsx               # NEW — Google button, handles callback URL
│   ├── member/page.tsx               # NEW — member dashboard
│   ├── admin/page.tsx                # NEW — placeholder, "coming soon" for now
│   ├── api/auth/[...nextauth]/route.ts  # NEW — NextAuth handler
│   └── api/attendance/mark/route.ts  # NEW — attendance POST endpoint
├── lib/
│   ├── auth.ts                       # NEW — NextAuth config
│   ├── auth/roles.ts                 # NEW — role allowlist
│   └── supabase.ts                   # NEW — Supabase server client
├── components/
│   ├── SignInButton.tsx              # NEW
│   ├── SignOutLink.tsx               # NEW
│   └── AttendanceButton.tsx          # NEW
├── middleware.ts                     # NEW — route guards
├── supabase/
│   └── migrations/
│       ├── 001_sessions.sql
│       ├── 002_members.sql
│       ├── 003_attendance.sql
│       ├── 004_announcements.sql
│       └── 005_rls.sql
└── .env.local                        # NEW — local-only; gitignored; env vars below
```

Environment variables needed:

| Name | Used by | Source |
|---|---|---|
| `NEXTAUTH_URL` | NextAuth | Vercel project URL (auto-set by Vercel integration) |
| `NEXTAUTH_SECRET` | NextAuth | Generated via `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | NextAuth | Google Cloud Console OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | NextAuth | Same |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase dashboard → API settings |

## 8. Public-site polish (Phase 1 scope locked today)

Concrete changes we make today on existing pages:

### 8.1 Contact page (`app/contact/page.tsx`)
Replace placeholders with real values. Two cards side by side:

- **Program Coordinator**: HG Mahaprema Krishna Das, `mahendra.prajapat@gmail.com`, +91 99001 70338 (tel link + WhatsApp link)
- **Website / IT help**: Anchal Nema, `anchaliitkgp@gmail.com`, +91 78792 94160 (tel link + WhatsApp link)

Venue card below, full-width:

- Full address (rendered as readable plain text)
- Prominent "📍 Open in Google Maps →" link to `https://maps.app.goo.gl/Lhim9TWNC3HKUMQG9` (opens in a new tab on desktop, deep-links to Google Maps app on mobile)

WhatsApp group card at the bottom:

- Shows "Coming soon — contact HG Mahaprema Prabhu to join" until WhatsApp invite URL is provided

### 8.2 Register page (`app/register/page.tsx`)
Since Google Form URL isn't available yet, replace iframe with a clear "Register via contact" fallback. Three steps: (1) call/WhatsApp Mahaprema Prabhu, (2) share names and kids' ages, (3) receive welcome message. Include clickable phone, WhatsApp, and email.

When Google Form URL becomes available, we swap iframe back in.

### 8.3 Home page (`app/page.tsx`)
- Fix `nextSunday()` post-program fallback to return `schedule.at(-1)`

### 8.4 Site-wide metadata
- Add a proper OG image at `public/og.png` (simple one for now: program name + tagline on saffron gradient)
- Per-page `<title>` and `<meta description>` in each page's exported `metadata`
- `app/sitemap.ts` — auto-generated from page list
- `app/robots.ts` — allow all
- Branded `app/not-found.tsx` — 404

### 8.5 Cleanup
- Delete `amplify.yml`
- Update `README.md` to describe Vercel flow
- Add `next-sitemap` or use Next's built-in sitemap route
- Font: load Inter via `next/font/google` in `app/layout.tsx`

### 8.6 Accessibility quick wins
- Add `aria-expanded` and `aria-controls` to the hamburger
- Ensure focus-visible styles (Tailwind's `focus-visible:ring-2 focus-visible:ring-saffron-500` on all interactive elements)

## 9. Member dashboard UX (MVP)

`/member` page after sign-in, in order:

1. **Welcome strip** — "Hare Krishna, [first name]! Role: Member" (or Organiser/Manager badge if applicable)
2. **Today's session block** — if today is a Sunday in `sessions`:
   - Week N · date · title · suggested speaker
   - Big saffron "Mark attendance" button (or "✅ Attendance confirmed" after click)
   - If today is not a session day: grey card "No session today. Next Sunday: Week N — date — title."
3. **My attendance** — count ("You've attended X of N sessions so far") + a simple list of past attended weeks
4. **Upcoming sessions** — next 4 sessions (week, date, title)
5. **Quick links** — to `/curriculum`, `/resources`, `/contact`
6. **Sign out link** at the bottom

Keep the UI minimal. No sidebars, no tabs.

## 10. Admin dashboard (placeholder today)

`/admin` exists but shows:
> "Admin tools are coming next weekend. Curriculum editor, announcements, member roster, and attendance view will live here. For now, contact Anchal for changes."

Gated by middleware so only Organiser/Manager can reach it. This proves the auth pipeline without us having to build the CRUD forms today.

## 11. Deployment plan (today)

1. Create Supabase project → apply migrations → grab URL + service role key
2. Create Google Cloud OAuth project → configure consent screen → generate client ID/secret with redirect `https://<vercel-domain>/api/auth/callback/google`
3. Install NextAuth, Supabase client; write config
4. Implement auth + member page + attendance
5. Fix public-site placeholders
6. Push to GitHub; connect Vercel project → import repo → set env vars → deploy
7. Test end to end on the Vercel URL: anonymous browse → sign in as Anchal → verify role = manager → visit `/admin` → sign out → sign in as a non-allowlist email → verify role = member → attempt `/admin` → rejected

## 12. Explicit non-goals today
- No tests (will add after launch)
- No CI / GitHub Actions
- No analytics
- No custom domain (ship on `*.vercel.app`)
- No Organiser curriculum editor
- No announcements UI
- No member roster
- No recordings, sadhana tracker, nominations

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Google OAuth consent screen verification slows us down | Use the "Testing" app type — up to 100 users allowed, no verification needed; fine for our sanga size |
| Supabase free tier has 2 concurrent DB connections — may throttle at scale | Not a concern at our scale; Postgres connection pooling is default |
| Timezone bug lets members mark attendance on the wrong day | Server re-validates against IST date; unique constraint backstops |
| Someone on the allowlist changes their Gmail | Code change + redeploy to update; acceptable for now |
| NextAuth v4 vs Next.js 14 App Router edge cases | Use the `getServerSession` pattern documented by NextAuth; avoid v5 beta |

## 14. Testing plan (manual for today)

| Scenario | Expected |
|---|---|
| Anonymous visits `/` | Home page loads, CTAs work |
| Anonymous visits `/member` | Redirected to `/signin` |
| Anonymous clicks "Sign in with Google" | Google consent → redirect to `/member` |
| Signed-in user with non-allowlist email visits `/admin` | Rejected with 403 |
| Signed-in manager (anchaliitkgp) visits `/admin` | Placeholder page loads |
| Member tries to mark attendance on a non-Sunday | Button disabled; API returns 400 |
| Member marks attendance on a Sunday | Row inserted; button flips to confirmed |
| Member tries to mark twice | Unique constraint returns error; UI shows already confirmed |
| Member signs out | Cookie cleared; `/member` redirects to `/signin` |

## 15. Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-05-09 | NextAuth v4, not v5 | v5 is beta on App Router |
| 2026-05-09 | Allowlist in code, not DB | Faster to ship; admin UI next weekend |
| 2026-05-09 | Public curriculum page reads from TS file, not DB | No reason to add DB latency to the public site today |
| 2026-05-09 | Service-role DB access from server only | RLS enabled for defense, writes happen through trusted code |
| 2026-05-09 | Timezone = Asia/Kolkata | Entire sanga is in Bengaluru; no multi-TZ complexity |

---

**End of design draft v1.** On your approval, I'll generate `tasks.md` with an ordered list of implementation tasks and start executing.
