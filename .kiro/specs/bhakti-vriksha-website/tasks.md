# Implementation Tasks — Bhakti Vriksha Radha Madan Mohan Website

**Scope:** Option A — Phase 1 public site + Phase 2 Google OAuth + Member dashboard + Self-attendance
**Order:** top-to-bottom; each task is independently shippable
**Convention:** `[ ]` = not started · `[-]` = in progress · `[x]` = complete · `[~]` = queued · `*` suffix = optional

---

## Group 1 — Phase 1 public-site polish (ship-blockers for sharing the URL)

- [x] 1. Fix `nextSunday()` post-program fallback in `app/page.tsx`
  - [x] 1.1 Change fallback from `schedule[0]` to `schedule.at(-1) ?? schedule[0]`
  - [x] 1.2 Verify home page still renders for all three cases (before program, during, after)

- [x] 2. Replace Contact page placeholders with real values in `app/contact/page.tsx`
  - [x] 2.1 Program Coordinator card: HG Mahaprema Krishna Das, `mahendra.prajapat@gmail.com`, +91 99001 70338 with `tel:`, `mailto:`, and `https://wa.me/919900170338` links
  - [x] 2.2 Website/IT help card: Anchal Nema, `anchaliitkgp@gmail.com`, +91 78792 94160 with the same link types
  - [x] 2.3 Venue card with full address (36, 5th A Cross, M.R. Riches Garden Layout, NRI Layout, Kalkere, Horamavu Post, Bengaluru, Karnataka 560016) and a prominent clickable "📍 Open in Google Maps" link to `https://maps.app.goo.gl/Lhim9TWNC3HKUMQG9` that opens in a new tab
  - [x] 2.4 WhatsApp group card shows "Coming soon — contact HG Mahaprema Prabhu to join" placeholder
  - [x] 2.5 Remove all "(placeholder)" grey tags from the page

- [x] 3. Update Register page fallback in `app/register/page.tsx`
  - [x] 3.1 Replace the placeholder iframe with a "Register via contact" 3-step block
  - [x] 3.2 Include clickable phone, email, WhatsApp links to HG Mahaprema Prabhu
  - [x] 3.3 Leave a code comment noting the iframe can be swapped back in once Google Form URL is available

- [x] 4. Add per-page metadata (title + description)
  - [x] 4.1 Export `metadata` from each `app/*/page.tsx` with a page-specific title and description
  - [x] 4.2 Keep the root `metadata` in `app/layout.tsx` as the default

- [x] 5. Add Open Graph image for link previews
  - [x] 5.1 Create a simple `public/og.png` (1200×630, saffron/krishna gradient, program name + tagline) — placeholder is fine today
  - [x] 5.2 Add `openGraph` and `twitter` objects to root `metadata` referencing `/og.png`

- [x] 6. Generate `sitemap.xml` and `robots.txt`
  - [x] 6.1 Create `app/sitemap.ts` listing all public routes
  - [x] 6.2 Create `app/robots.ts` allowing all user-agents and pointing to the sitemap

- [x] 7. Add branded 404 page
  - [x] 7.1 Create `app/not-found.tsx` with the program's saffron/krishna styling and a link back home

- [x] 8. Fix Navbar accessibility
  - [x] 8.1 Add `aria-expanded` bound to `open` state on the hamburger button
  - [x] 8.2 Add `aria-controls` pointing to the mobile nav id
  - [x] 8.3 Add `focus-visible:ring-2 focus-visible:ring-saffron-500` to all interactive elements in Navbar

- [x] 9. Load Inter font via `next/font`
  - [x] 9.1 In `app/layout.tsx`, import `Inter` from `next/font/google` and apply it as a CSS variable
  - [x] 9.2 Reference the variable in `tailwind.config.ts`'s `fontFamily.sans`

- [x] 10. Cleanup stale Amplify artifacts
  - [x] 10.1 Delete `amplify.yml`
  - [x] 10.2 Rewrite `README.md` to describe Vercel + Supabase flow instead of Amplify

- [x] 11. Verify build and run locally
  - [x] 11.1 `npm run build` passes cleanly
  - [x] 11.2 `npm run dev` shows all pages with no console errors

- [x] 12. Commit Phase 1 polish and push
  - [x] 12.1 Commit with a clear `feat(public): ...` message listing the changes
  - [x] 12.2 Push to `origin/main`

---

## Group 2 — Environment setup (you do these, I guide)

- [x] 13. Create Supabase project
  - [x] 13.1 Sign up at supabase.com (free tier, no card needed)
  - [x] 13.2 Create a new project named `bhakti-vriksha`
  - [x] 13.3 Note down the project URL and service-role key
  - [x] 13.4 Paste both to me so I can continue

- [x] 14. Create Google Cloud OAuth credentials
  - [x] 14.1 Go to console.cloud.google.com → create a new project `bhakti-vriksha-auth`
  - [x] 14.2 Configure OAuth consent screen as "External" in Testing mode, with your personal Gmail as the test user
  - [x] 14.3 Create OAuth 2.0 Client ID for a Web application
  - [x] 14.4 For today, authorized JavaScript origin: `http://localhost:3000`; after deploy we add the Vercel URL
  - [x] 14.5 Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (and Vercel URL's callback after deploy)
  - [x] 14.6 Note Client ID and Client Secret
  - [x] 14.7 Paste both to me

- [x] 15. Create Vercel project and link GitHub repo
  - [ ] 15.1 Sign in at vercel.com with GitHub
  - [ ] 15.2 Import `anchaliitkgp/bhakti-vriksha-site`
  - [ ] 15.3 Initial deploy (will succeed even before env vars, as public pages don't depend on them)
  - [ ] 15.4 Note the deployed URL

---

## Group 3 — Database schema (I do these)

- [x] 16. Author SQL migrations
  - [x] 16.1 `supabase/migrations/001_sessions.sql` — `sessions` table with unique(week) and unique(date)
  - [x] 16.2 `supabase/migrations/002_members.sql` — `members` table
  - [x] 16.3 `supabase/migrations/003_attendance.sql` — `attendance` table with FKs and unique(member_id, session_week)
  - [x] 16.4 `supabase/migrations/004_announcements.sql` — `announcements` table (stub, no UI today)
  - [x] 16.5 `supabase/migrations/005_rls.sql` — enable RLS with policies for self-read, organiser-read-all

- [x] 17. Seed script for `sessions`
  - [x] 17.1 `supabase/seed/seed-sessions.ts` — reads `data/schedule.ts` and inserts 32 rows on a fresh DB
  - [x] 17.2 Add an npm script `seed:sessions` that runs it against the live Supabase using the service-role key from `.env.local`

- [x] 18. Apply migrations and seed to Supabase
  - [x] 18.1 Run migrations via Supabase dashboard SQL editor (copy-paste) or CLI (`supabase db push`)
  - [x] 18.2 Run the seed script
  - [x] 18.3 Verify 32 `sessions` rows via SQL tab

---

## Group 4 — Auth implementation

- [x] 19. Install auth & DB dependencies
  - [x] 19.1 `npm install next-auth@4 @auth/core @supabase/supabase-js`
  - [x] 19.2 `npm install -D @types/next-auth` (if needed for TS)

- [x] 20. Create environment variable template
  - [x] 20.1 `.env.local.example` with keys: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - [x] 20.2 Add `.env.local` to `.gitignore` (already there, verify)
  - [x] 20.3 You populate `.env.local` locally with real values from Groups 2–3

- [-] 21. Implement role allowlist
  - [x] 21.1 `lib/auth/roles.ts` with `type Role` and `roleFor(email)` function
  - [x] 21.2 Allowlist entries: `anchaliitkgp@gmail.com` → manager, `mahendra.prajapat@gmail.com` → organiser
  - [x] 21.3 TODO comment for Vinita Mataji's email when available
  - [ ] 21.4 Unit test for `roleFor()` (inline, simple) — optional*

- [x] 22. Implement NextAuth configuration
  - [x] 22.1 `lib/auth.ts` exporting `authOptions` with Google provider and JWT strategy
  - [x] 22.2 JWT callback: read email, set `token.role = roleFor(email)`
  - [x] 22.3 Session callback: expose `session.user.role`
  - [x] 22.4 SignIn callback: upsert into `members` table via Supabase service client
  - [x] 22.5 TypeScript augment `next-auth` module to add `role` to `Session["user"]`

- [x] 23. Create NextAuth API route
  - [x] 23.1 `app/api/auth/[...nextauth]/route.ts` exports `GET` and `POST` from `NextAuth(authOptions)`

- [x] 24. Create Supabase server client
  - [x] 24.1 `lib/supabase.ts` exports `supabaseServer()` using `SUPABASE_SERVICE_ROLE_KEY`, never imported by client components

- [x] 25. Create `/signin` page
  - [x] 25.1 `app/signin/page.tsx` — simple centered card with "Continue with Google" button calling `signIn("google")`
  - [x] 25.2 Handle `callbackUrl` query param for post-signin redirect
  - [x] 25.3 Link back to home for users who changed their mind

- [x] 26. Add auth-aware nav links
  - [x] 26.1 Update `components/Navbar.tsx` to show "Sign in" for guests and "Hi, [first name]" + "Sign out" for signed-in users
  - [x] 26.2 Fetch session via `useSession()` (needs `SessionProvider` in `app/layout.tsx`)
  - [x] 26.3 Show "Admin" link only for organiser/manager roles

- [x] 27. Add `SessionProvider` wrapper
  - [x] 27.1 Create `app/providers.tsx` as a client component that wraps children in `<SessionProvider>`
  - [x] 27.2 Use it inside `app/layout.tsx`

- [x] 28. Implement route-guard middleware
  - [x] 28.1 `middleware.ts` at project root using `withAuth` from `next-auth/middleware`
  - [x] 28.2 Config matcher: `/member/:path*`, `/admin/:path*`, `/api/attendance/:path*`
  - [x] 28.3 `authorized` callback rejects guests for member routes and non-organiser/manager for admin routes
  - [x] 28.4 Create `app/403/page.tsx` for forbidden access

---

## Group 5 — Member dashboard + attendance

- [x] 29. Member dashboard page
  - [x] 29.1 `app/member/page.tsx` — server component reading `getServerSession`
  - [x] 29.2 Welcome strip with first name + role badge
  - [x] 29.3 Fetch today's session from DB (or TS file fallback) based on IST date
  - [x] 29.4 Render attendance block (see task 30)
  - [x] 29.5 List "My attendance" — count + last 5 sessions attended
  - [x] 29.6 List "Upcoming sessions" — next 4

- [x] 30. Attendance button component
  - [x] 30.1 `components/AttendanceButton.tsx` — client component
  - [x] 30.2 Accepts props: `{ week, sessionDate, alreadyMarked }`
  - [x] 30.3 Enabled only if today (IST) === sessionDate AND !alreadyMarked
  - [x] 30.4 Shows disabled state with explanation on other days
  - [x] 30.5 On click POST to `/api/attendance/mark`; show success/error toast
  - [x] 30.6 After success, swap to "✅ Attendance confirmed"

- [x] 31. Attendance API endpoint
  - [x] 31.1 `app/api/attendance/mark/route.ts` — POST handler
  - [x] 31.2 Read session from cookie via `getServerSession(authOptions)`
  - [x] 31.3 Validate request body has `week: number`
  - [x] 31.4 Fetch session row, compare `session.date` to IST "today"
  - [x] 31.5 Reject non-session-day with 400 and clear message
  - [x] 31.6 Lookup or create `member` row by email
  - [x] 31.7 Insert into `attendance`; handle unique-violation gracefully
  - [x] 31.8 Return `{ ok: true }` on success

- [x] 32. Admin placeholder page
  - [x] 32.1 `app/admin/page.tsx` — reads session, checks role is organiser/manager (defensive; middleware already guards)
  - [x] 32.2 Static "Admin tools coming next weekend" content
  - [x] 32.3 Brief list of features that will live here

---

## Group 6 — Deployment & verification

- [ ] 33. Set Vercel environment variables
  - [ ] 33.1 In Vercel project settings → Environment Variables, add all six env vars from task 20
  - [ ] 33.2 Redeploy

- [ ] 34. Update Google OAuth redirect URIs for production
  - [ ] 34.1 Add `https://<vercel-url>` to Authorized JavaScript origins
  - [ ] 34.2 Add `https://<vercel-url>/api/auth/callback/google` to Authorized redirect URIs

- [ ] 35. Manual end-to-end testing (live URL)
  - [ ] 35.1 Anonymous visits home; CTAs work; nav works
  - [ ] 35.2 Anonymous navigates all 8 public pages; contact page shows real info; map link opens Google Maps
  - [ ] 35.3 Anonymous hits `/member` → redirected to `/signin`
  - [ ] 35.4 Signs in with `anchaliitkgp@gmail.com` → redirected to `/member` → role shows Manager → `/admin` reachable
  - [ ] 35.5 Signs out; cookie cleared; `/member` redirects again
  - [ ] 35.6 Sign in with a different Google account (test Member role) → `/admin` returns 403
  - [ ] 35.7 Attendance button shows correct enabled/disabled state based on IST date
  - [ ] 35.8 Marking attendance inserts a row; second click is prevented

- [ ] 36. Smoke-test Supabase data
  - [ ] 36.1 After at least one sign-in, verify a `members` row exists with the correct role
  - [ ] 36.2 After at least one attendance mark, verify an `attendance` row exists
  - [ ] 36.3 Verify RLS is enabled on all tables (even though we use service role from server)

- [ ] 37. Share the live URL
  - [ ] 37.1 Confirm public URL works in incognito
  - [ ] 37.2 Test OG preview using a tool like opengraph.xyz
  - [ ] 37.3 Share with HG Mahaprema Prabhu and HG Vrajeshwari Vinita Mataji via WhatsApp

---

## Group 7 — Post-launch cleanup (optional today*)

- [ ] 38.* Write a short `SETUP.md` with step-by-step instructions for Groups 2–3 so you can rebuild the infra if needed
- [ ] 39.* Add `SECURITY.md` with privacy and data retention notes
- [ ] 40.* Publish `/privacy` page summarizing what data we store about signed-in members

---

## Deferred to next weekend (not today)

These are tracked here for visibility but are **out of scope for today**:

- Organiser curriculum editor at `/admin/curriculum` (US-16)
- Announcement posting UI (US-17)
- Member roster view + CSV export (US-18)
- Attendance-on-behalf (US-19)
- Vinita Mataji's allowlist entry once email provided (OQ-5)
- Custom domain
- Google Form URL swap-in once available
- WhatsApp group URL swap-in once available

---

**End of tasks v1.**

On your "let's go" I'll start executing from task 1. I'll mark tasks in-progress before working and completed after, so you can follow along in the task list.
