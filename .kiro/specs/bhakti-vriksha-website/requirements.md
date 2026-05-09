# Requirements — Bhakti Vriksha Radha Madan Mohan Website

**Status:** Draft v2 (reverse-engineered from existing code + clarified with role & phase model)
**Owner:** Anchal Nema
**Last updated:** 2026-05-09

---

## 1. Background

Bhakti Vriksha Radha Madan Mohan is a weekly ISKCON-inspired Sunday family sanga launching **Sunday 31 May 2026**, running 32 weeks through **Sunday 3 January 2027**. The program teaches the Bhagavad-gita chapter by chapter with practical sessions from HG Radheshyam Prabhu's newcomer courses every 4th week. It targets married couples, their children, youth, and newcomers to Krishna consciousness.

A first-cut public website has already been built (Next.js 14, TypeScript, Tailwind, 8 pages) and pushed to `github.com/anchaliitkgp/bhakti-vriksha-site`. This spec documents what exists, formalizes what the full product should do across three phases, and surfaces gaps to close.

## 2. Product Vision — Three-Role Model

The site supports three user roles plus one super-admin:

| Role | Authenticated? | What they experience |
|---|---|---|
| **Public (Guest)** | No | Read-only access to the entire marketing site, curriculum, speakers, resources, gallery, venue address, WhatsApp group invite, and the Google Form registration. |
| **Member** | Yes (Google) | Everything a Guest can do, plus: mark Sunday attendance, track personal sadhana (future), watch session recordings (future). |
| **Organiser** | Yes (Google, elevated) | Everything a Member can do, plus: edit curriculum (topics, dates, suggested speakers), post announcements, see aggregate member data, mark attendance, approve speaker self-nominations. |
| **Website Manager** (super-admin) | Yes (Google, elevated) | Everything an Organiser can do, plus: edit the role allowlist, change technical configuration, manage deploys. |

### Who holds each role

| Role | People |
|---|---|
| Public | Anyone visiting the URL |
| Member | Any signed-in family whose Google email isn't in the Organiser or Manager allowlist |
| Organiser | HG Mahaprema Krishna Das, HG Vrajeshwari Vinita DD |
| Website Manager | Anchal Nema |

**Role assignment mechanism:** a hard-coded allowlist of Google email addresses, stored in config for Phase 2 and migrated to a database table in Phase 3.

## 3. Goals

| # | Goal | Success signal |
|---|---|---|
| G1 | A visitor lands, understands what the program is, and knows how to join within one screen. | Register CTA is the most prominent action above the fold. |
| G2 | Prospective families can see the full 32-week curriculum and decide if it fits them. | Full schedule visible on one page, mobile-readable. |
| G3 | Current participants can check "what's this Sunday?" in under 5 seconds. | Next-Sunday banner on home page is always current. |
| G4 | Members can mark their Sunday attendance in under 10 seconds, only on the day of the session. | Attendance button is visible only on the Sunday date; disabled before and after. |
| G5 | Organisers can edit the curriculum without touching code or asking the Website Manager. | Organisers use a UI to change a session's topic, date, or speaker. |
| G6 | The Website Manager can update schedule, speakers, copy, and contact info without re-coding pages. | All weekly content lives in editable data/DB; docs explain how. |
| G7 | Site is safe for kids' data and respects devotee privacy. | No public photos of kids without consent. No tracking cookies by default. |
| G8 | Site runs on free-tier consumer infrastructure. | Vercel hobby + Supabase free tier; domain optional. |

## 4. Phased Scope

Roles and features are delivered across three phases. **Today's commitment is Option A: Phase 1 public + Phase 2 auth + attendance. Organiser tools defer to next weekend.**

### Today's Actual Scope (Option A)

Shipping in a single day:
- **Phase 1 public site** — real contacts, venue, map, metadata, robots/sitemap, Vercel deploy
- **Google OAuth** via NextAuth.js with role allowlist
- **Member dashboard** at `/member` showing profile + attendance history
- **Member self-attendance** — button visible and writable only on the Sunday of a scheduled session (IST)
- **Role guards** — `/member/*` requires login; `/admin/*` requires Organiser/Manager (page exists but empty)
- **Supabase** DB with `sessions`, `members`, `attendance` tables (no `announcements` yet)

Explicitly deferred from today to next weekend:
- Organiser curriculum editor (US-16) — biggest single piece; needs forms + validation + audit log
- Announcements banner (US-17)
- Member roster view + CSV export (US-18)
- Organiser attendance on behalf (US-19)

### Phase 1 — Public Site (launched today)

**Scope:**
- 8 public pages: Home, About, Curriculum, Speakers, Resources, Gallery, Register, Contact
- Real contact email, WhatsApp group invite URL, venue address
- Real Google Form URL for registration
- Metadata (titles, descriptions, OG tags)
- `robots.txt`, `sitemap.xml`, branded 404
- Deploy on Vercel
- README updated for Vercel flow; `amplify.yml` removed

**Out of Phase 1:**
- Any login, auth, or member-only feature
- Database
- Attendance tracking
- Organiser tools
- Recordings

### Phase 2 — Member & Organiser Features (target: within 2–4 weeks of launch)

**Authentication & Authorization:**
- Google OAuth via NextAuth.js
- Hard-coded allowlist of email addresses in config (`lib/auth/roles.ts` or similar) classifying each logged-in user as Member, Organiser, or Website Manager
- Default role for any authenticated user not on the allowlist: **Member**
- Route guards that protect `/member/*` and `/admin/*` paths

**Member features:**
- Sign-in page with Google button
- Member dashboard at `/member` showing: my profile (Google name + email), my attendance history, today's session (if Sunday), recordings list (when available)
- **Self-attendance marking** — button visible and clickable *only* on the exact Sunday of the session; disabled with a visible reason on all other days; writes `member_id, session_week, marked_at` to the database
- Sign-out from nav

**Organiser features:**
- Admin dashboard at `/admin`
- **Curriculum editor** — edit session title, date, category, suggested speaker, suggested level, notes for any week; saved to database and reflected on the public curriculum page on next refresh
- **Announcement posting** — write a short text that appears as a yellow bar on the home page; auto-expires after a set date
- **Member roster view** — see all signed-in members (name, email, family size if captured, attendance count)
- **Member roster CSV export** — download the roster as CSV
- **Attendance view** — see who marked attendance for each Sunday
- Mark attendance on behalf of a member (in case a member forgot to mark on the day)
- Approve speaker self-nominations (when US-14 is built; may be deferred to Phase 3)

**Website Manager (you) additionally:**
- Still edit `data/schedule.ts` seed data in git (the DB is seeded from this on first deploy)
- Full database access (Supabase dashboard)
- Vercel deploy, domain, env vars

**Database:**
- Supabase (free tier) with tables: `sessions`, `members`, `attendance`, `announcements`
- Sessions seeded from the current `data/schedule.ts` on first run; subsequently editable by Organisers

**Out of Phase 2:**
- Role management UI (still allowlist in code)
- Session recordings
- Per-family sadhana tracker
- Private photo gallery

### Phase 3 — Richer Member Experience (target: Q3 2026)

**Scope:**
- **Role management UI** for Website Manager — add/remove Organisers through a web page (allowlist moves from code to DB)
- **Session recordings** — Organisers upload YouTube unlisted links per session; gated behind Member auth
- **Per-family sadhana tracker** — daily rounds, reading pages, etiquette practice log; member-only views their own data; Organisers see aggregate
- **Speaker self-nomination form** — any Member can nominate themselves for a future session; Organisers approve
- **Private kids' content** — crafts, stories behind Member auth
- **Weekly email digest** — "next Sunday" email with calendar attachment

**Out of Phase 3:**
- Multi-language (Hindi) — deferred to Phase 4
- Payments / donations — deferred
- Comments / discussions — deferred

## 5. Personas

| Persona | Goal on the site | Tech comfort |
|---|---|---|
| **Prospective parent** (Nisha, 34) | Understand the program; decide whether to bring her family; register. | Smartphone, WhatsApp power user. |
| **Prospective teen** (Rohit, 16) | See if this is "cool" enough; scan speakers and activities. | Mobile-first, high expectations. |
| **Current member** (Ravi, 42) | "What's this Sunday? Who's speaking? Where?" Mark attendance. | Mixed — desktop at work, phone at home. |
| **Potential speaker** (Shekhar Prabhuji) | See where he fits in the roster; self-nominate for sessions. | Comfortable with forms, WhatsApp, email. |
| **Organiser** (HG Mahaprema Krishna Das, HG Vrajeshwari Vinita DD) | Edit curriculum, see member attendance, post announcements, approve nominations. | Mixed — may ask Anchal for technical help initially. |
| **Website Manager** (Anchal) | Update everything; own the technical admin. | Engineer, comfortable in code. |

## 6. User Stories & Acceptance Criteria

### Phase 1 Stories

### US-1 — Landing experience
**As** a first-time visitor, **I want** to immediately understand what the program is, when it starts, and how to join, **so that** I can make a decision in one scroll.

Acceptance criteria:
- Hero shows program name, tagline, and primary CTA ("Register your family") above the fold on mobile
- Secondary CTA takes me to the curriculum
- Next-Sunday banner shows week number, date, topic, suggested speaker
- Page loads in under 2 seconds on a 3G mobile connection
- On a 360×640 screen no critical content is horizontally cut off

**Status:** Mostly met. Gaps: load-time not measured; no Lighthouse budget enforced.

### US-2 — Understanding the program
**As** a prospective family, **I want** to read a concise description of the program, the teachers, and what a Sunday looks like, **so that** I can decide whether it fits us.

Acceptance criteria:
- About page has program overview, "What is Bhakti Vriksha" philosophy blurb, teacher bios, who-can-join list, what-to-expect timeline
- Teacher bios are labelled by role (Senior Teacher; Program & Youth Lead)
- Language is warm, family-oriented, not corporate
- Information is scannable (headings, short paragraphs, lists)

**Status:** Met at content level. Gap: teacher bios are 2–3 sentences; photos not yet added.

### US-3 — Full curriculum
**As** a visitor or member, **I want** to see the full 32-week schedule with dates, topics, and suggested speakers, **so that** I can plan ahead.

Acceptance criteria:
- All 32 weeks listed with week number, Sunday date, topic, category (Gita / Practical), suggested speaker, speaker level
- Practical sessions are visually distinct from Gita sessions
- Dates are rendered in Indian English locale
- Mobile readable (horizontal scroll if needed)
- Start date 31 May 2026, last date 3 January 2027
- Every 4th Sunday (4, 8, 12, 16, 20, 24, 28, 32) is a practical session

**Status:** Met.

### US-4 — Knowing the current week
**As** a member, **I want** a "next Sunday" pointer on the home page, **so that** I can open the site on Saturday and know what's coming.

Acceptance criteria:
- Home shows the first session in the schedule whose date is today or later
- If the program hasn't started, shows week 1
- If the program has ended, shows the last session gracefully

**Status:** Met for first two cases. Gap: post-program fallback points to `schedule[0]` instead of the last session.

### US-5 — Speaker roster
**As** a member or potential speaker, **I want** to see the list of speakers, their seniority level, and their role, **so that** I understand who teaches what.

Acceptance criteria:
- Speakers listed with L1–L4 level badges, name, role, short description
- "Want to speak?" section explains self-nomination path (Phase 1: contact Anchal; Phase 3: online form)

**Status:** Met.

### US-6 — Resources
**As** a member, **I want** curated links to Vedabase and HG Radheshyam Prabhu's newcomer courses, **so that** I can continue study between Sundays.

**Status:** Met.

### US-7 — Registration (Phase 1)
**As** a prospective family, **I want** an easy way to register interest and get added to the WhatsApp group, **so that** I can receive session details.

Acceptance criteria:
- Register page explains the 3-step join process
- When a Google Form URL is available, it is embedded inline
- Until the Google Form is ready, the Register page directs visitors to contact HG Mahaprema Krishna Das (phone, email, WhatsApp) for registration
- Form (when live) works on mobile; kids' data fields are optional
- Alternative WhatsApp-based registration path is documented

**Status:** Real contacts now available. Google Form URL deferred — Register page uses "contact us" fallback until provided.

### US-8 — Contact, venue & WhatsApp group (PUBLIC)
**As** a member or prospect, **I want** coordinator contact details, venue address with map link, and access to the WhatsApp group, **so that** I can get human help and join the sanga quickly.

Acceptance criteria:
- Contact page shows two contact cards:
  - **Program Coordinator:** HG Mahaprema Krishna Das — `mahendra.prajapat@gmail.com`, +91 99001 70338
  - **Website / IT help:** Anchal Nema — `anchaliitkgp@gmail.com`, +91 78792 94160
- Phone numbers are clickable on mobile (`tel:` links) and WhatsApp-clickable (`wa.me` links)
- Email addresses are `mailto:` links
- **Venue address shown publicly**: 36, 5th A Cross, M.R. Riches Garden Layout, NRI Layout, Kalkere, Horamavu Post, Bengaluru, Karnataka 560016
- Venue block includes a clickable **"Open in Google Maps"** pin that goes to https://maps.app.goo.gl/Lhim9TWNC3HKUMQG9 and opens the maps app on mobile or Google Maps on desktop
- WhatsApp group invite link is publicly clickable **when available**; until provided, a "Coming soon — contact us to join" placeholder is shown

**Status:** Real contacts + venue + map link available. WhatsApp group URL deferred.

### US-9 — Gallery (Phase 1: public only)
**As** a visitor, **I want** to see photos of past Sundays, kirtans, outings and festivals, **so that** I can picture what attending feels like.

Acceptance criteria:
- Grid layout, mobile-friendly
- Images have alt text
- **No identifiable photos of minors without parental consent**
- Lazy loading

**Status:** Placeholders only.

### US-10 — Mobile navigation
**As** a phone user, **I want** a usable nav on small screens, **so that** I can reach any page with one tap.

**Status:** Met. Gap: hamburger has `aria-label` but no `aria-expanded` binding.

### US-11 — Content maintainability (Website Manager)
**As** Anchal, **I want** to update schedule dates, topics, speakers, and contact info by editing one or two files, **so that** I do not need to re-code pages weekly.

**Status:** Met for Phase 1 scope (schedule + speakers + resources in files).

### Phase 2 Stories (Login + Member + Organiser)

### US-12 — Sign in with Google
**As** a member or organiser, **I want** to sign in with my Google account, **so that** I can access member/organiser features without managing a new password.

Acceptance criteria:
- `/signin` page with a "Continue with Google" button
- On successful sign-in, user is redirected to `/member` (or `/admin` for Organisers/Manager)
- The navbar shows "Sign in" for guests and "Hi, [first name]" + "Sign out" for signed-in users
- Session persists across tabs and survives browser restarts for a reasonable period
- Sign-out clears the session and returns user to the home page

### US-13 — Role-based access
**As** the system, **I want** to assign the right role to each signed-in user, **so that** capabilities match each person's responsibility.

Acceptance criteria:
- A config file holds an allowlist: `{ email → role }` for Organisers and Website Manager
- Any authenticated user not in the allowlist is treated as a Member by default
- `/admin/*` routes reject Members and Guests with a clear message
- Member-only routes reject Guests but allow Members, Organisers, and Manager
- The allowlist can be edited by the Website Manager via a code change + redeploy (Phase 3 replaces this with a UI)

### US-14 — Member self-attendance (ON THE DAY ONLY)
**As** a Member, **I want** to mark my attendance on the Sunday I attend, **so that** the program has a simple record.

Acceptance criteria:
- A "Mark attendance" button appears on the Member dashboard **only when today is the Sunday of a scheduled session**
- Outside that Sunday, the button is **not visible** or is disabled with a visible reason ("Attendance for week N can only be marked on [date]")
- On click, the system records `(member_id, session_week, session_date, marked_at)` in the DB
- Once marked, the button changes to "Attendance confirmed ✅" for the remainder of the day
- Organisers and Manager can mark attendance on behalf of a member up to 7 days later
- Members cannot un-mark or modify attendance once recorded

### US-15 — Member dashboard
**As** a Member, **I want** a simple dashboard showing my name, today's session (if Sunday), and my attendance so far, **so that** I have a home base on the site.

Acceptance criteria:
- `/member` page, only accessible when signed in
- Shows Google profile name and email
- Shows today's session details if today is a Sunday in the schedule
- Shows count of sessions attended vs total
- Shows link to view full attendance history

### US-16 — Organiser edits curriculum
**As** an Organiser, **I want** to edit session topic, date, category, suggested speaker, level, and notes from the site, **so that** I don't need to ask the Website Manager for every change.

Acceptance criteria:
- `/admin/curriculum` page lists all 32 sessions in a form
- Each field is editable inline with a save button per row
- Saving updates the DB; the public `/curriculum` page reflects the change within 60 seconds (or on hard refresh)
- An audit log records who changed what and when
- Changes are validated (dates must be Sundays; week numbers must be unique)

### US-17 — Organiser posts announcements
**As** an Organiser, **I want** to post a short announcement that shows on the home page, **so that** I can share last-minute changes with the sanga.

Acceptance criteria:
- Announcement form with text (max 280 chars), start date, end date
- Published announcements show as a coloured banner on the home page
- Multiple active announcements cycle or stack (design decision)
- Expired announcements are hidden but retained for 30 days

### US-18 — Organiser views member roster
**As** an Organiser, **I want** to see the list of all signed-in members with their attendance summary, **so that** I can follow up with infrequent attendees and plan accordingly.

Acceptance criteria:
- `/admin/members` page lists all members who have signed in at least once
- For each member: name, email, first-seen date, last-seen date, attendance count
- Sortable by any column
- CSV download of the full roster

### US-19 — Organiser marks attendance for others
**As** an Organiser, **I want** to mark attendance on behalf of a member who forgot to mark on the day, **so that** our attendance data is accurate.

Acceptance criteria:
- From the attendance view, Organiser can select a past session and add/remove a member's attendance
- Limited to sessions in the past 7 days
- Audit log records the Organiser who made the change

### NFR Stories — apply to every feature

### NFR-1 — Performance
- Public pages render in under 2 seconds on a 3G mobile connection
- First Load JS budget per page: under 120 KB gzipped for public pages; under 180 KB for authenticated pages
- Images optimized via Next.js `<Image>`
- Static pre-render preferred for all public pages

### NFR-2 — Accessibility
- WCAG 2.1 AA minimum (contrast, keyboard nav, alt text, semantic headings)
- All interactive controls reachable by keyboard
- ARIA labels on icon-only controls; `aria-expanded` on toggles
- Touch targets ≥ 44×44 px on mobile

### NFR-3 — SEO (public pages only)
- Unique `<title>` and `<meta description>` per page
- `og:image`, `og:title`, `og:description` set at root and overridable
- `sitemap.xml` and `robots.txt` generated at build time
- Canonical URLs

### NFR-4 — Privacy
- Public site: no third-party tracking without explicit consent
- Signed-in users: we store only Google name, email, Google sub-id, attendance records, role
- Kids' photos: public gallery never contains identifiable minors; Phase 3 may add a gated family gallery with written consent
- A privacy statement is published at `/privacy`

### NFR-5 — Security
- HTTPS only (Vercel default)
- Secrets in `.env` files only; never committed; Vercel env vars for production
- Dependencies patched regularly
- NextAuth secret rotated before launch

### NFR-6 — Content tone
- Warm, devotee-appropriate; use `Prabhu`, `Mataji`, `Prabhupada`, `kirtan`, `japa`, `sanga`, `seva` naturally
- Explain Shraddhavan/Sevaka/Sadhaka where referenced

### NFR-7 — Browser support
- Chrome, Safari, Firefox, Edge modern
- iOS Safari 14+ and Chrome Android current-1

### NFR-8 — Deployment
- Vercel auto-deploy on push to `main`
- Preview deploys on pull requests
- `*.vercel.app` or custom domain (later)

### NFR-9 — Observability (Phase 2+)
- Vercel Web Analytics or Plausible (privacy-friendly)
- Error monitoring (Sentry free tier) for authenticated routes
- Basic structured logging for attendance and curriculum edits

## 7. Technical Constraints

| Area | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | Already implemented |
| Language | TypeScript strict | Already configured |
| Styling | Tailwind CSS | Already configured |
| Hosting | Vercel free tier | Chosen after evaluating Amplify |
| Auth | NextAuth.js with Google provider | Well-supported, free, Vercel-native |
| Database | Supabase Postgres (free tier) | Free, managed, generous limits |
| Source control | GitHub, SSH auth | Already set up |
| Registration form (Phase 1) | Google Form embed | No backend |
| Role assignment | Hard-coded allowlist in `lib/auth/roles.ts` (Phase 2), migrate to DB (Phase 3) | Matches a small trusted team |

## 8. Assumptions

1. Program starts **31 May 2026**; ends **3 January 2027**. All 32 dates are Sundays.
2. The 4-week practical cadence (weeks 4, 8, 12, 16, 20, 24, 28, 32) is fixed.
3. Speaker levels L1–L4 stay fixed within the first year.
4. All Organisers and the Website Manager have personal Gmail addresses to use for sign-in.
5. English-only for Phases 1–3.
6. Attendance is binary per Sunday (attended / not) — no partial or late markers.
7. One attendance record per member per Sunday — no "family" grouping yet (Phase 3 may add it).

## 9. Open Questions

| # | Question | Blocking phase | Answer |
|---|---|---|---|
| OQ-1 | Real contact email to display? | Phase 1 launch | **Answered.** Primary coordinator: HG Mahaprema Krishna Das — `mahendra.prajapat@gmail.com`, +91 99001 70338. IT help: Anchal Nema — `anchaliitkgp@gmail.com`, +91 78792 94160. |
| OQ-2 | Real WhatsApp group invite URL? | Phase 1 launch | **Deferred.** Will be provided; show "Coming soon — contact us to join" until available. |
| OQ-3 | Real Google Form URL for registration? | Phase 1 launch | **Deferred.** Until provided, Register page directs visitors to contact HG Mahaprema Prabhu via phone/email/WhatsApp. |
| OQ-4 | Real venue address? | Phase 1 launch | **Answered.** 36, 5th A Cross, M.R. Riches Garden Layout, NRI Layout, Kalkere, Horamavu Post, Bengaluru, Karnataka 560016. Google Maps: https://maps.app.goo.gl/Lhim9TWNC3HKUMQG9 — render as a clickable pin that opens the maps app on mobile and maps.google.com in browsers. |
| OQ-5 | Gmail addresses of HG Mahaprema Krishna Das and HG Vrajeshwari Vinita DD (for Organiser allowlist)? | Phase 2 | Mahaprema Prabhu: `mahendra.prajapat@gmail.com`. Vinita Mataji: **pending.** |
| OQ-6 | Your personal Gmail (for Website Manager allowlist)? | Phase 2 | **Answered.** `anchaliitkgp@gmail.com`. |
| OQ-7 | Custom domain at launch or post-launch? | Phase 1 nice-to-have | Post-launch. |
| OQ-8 | How to handle kids' photos — require consent every time, or blanket consent at registration? | Before Phase 1 gallery fills up | Open. |
| OQ-9 | Do we want visitor analytics (Plausible, Vercel Web Analytics) from day one? | Phase 1 launch | Open. |
| OQ-10 | What timezone do we treat as "today" for attendance-day validation? | Phase 2 | IST (Asia/Kolkata). |
| OQ-11 | Do announcements also go to the WhatsApp group, or just the website? | Phase 2 | Open. |
| OQ-12 | Should attendance be visible to other Members, or only to Organisers? | Phase 2 | Open. |

## 10. Known Gaps in Current Code

These gaps exist in the committed code today:

1. `app/register/page.tsx` — iframe `src` is a placeholder (`YOUR_FORM_ID`).
2. `app/contact/page.tsx` — email, WhatsApp number, WhatsApp group href, venue are placeholders.
3. `app/page.tsx` — `nextSunday()` falls back to `schedule[0]` post-program; should use last session.
4. `app/gallery/page.tsx` — 9 lamp-emoji placeholders, no real images.
5. `components/Navbar.tsx` — hamburger missing `aria-expanded` binding.
6. `amplify.yml` still present although deployment target is Vercel.
7. No `sitemap.xml`, `robots.txt`, `og:image`, or per-page metadata.
8. No analytics.
9. No 404 page; Next.js default is fine but a branded one is nicer.
10. Speaker roster (`speakers` export) has no `Speaker` interface; sessions do.
11. Inter font declared in Tailwind config but not loaded via `next/font`.
12. README still describes AWS Amplify; should describe Vercel.
13. No tests and no CI checks.

Phase 1 closes items 1, 2, 3, 6, 7, 9, 12. Items 4, 5, 8, 10, 11, 13 are polish items across phases.

## 11. Success Criteria

### Phase 1 — Public Site Launch (today)
- ✅ All 8 pages render on desktop and mobile without errors
- ✅ Real contact email, WhatsApp URL, Google Form URL, venue address replace placeholders
- ✅ `nextSunday()` handles post-program fallback
- ✅ Each page has unique `<title>` and `<meta description>`
- ✅ `og:image` for link preview
- ✅ `sitemap.xml` and `robots.txt` generated
- ✅ Vercel auto-deploy from `main` working
- ✅ `amplify.yml` removed; README updated for Vercel
- ✅ Shareable URL works (`*.vercel.app` or custom)
- ✅ Branded 404 page

### Phase 2 — Member & Organiser (2–4 weeks post-launch)
- ✅ Google sign-in works end to end
- ✅ Role allowlist correctly classifies Members, Organisers, Manager
- ✅ `/admin/*` is inaccessible to Members
- ✅ Member can mark attendance only on a Sunday session date
- ✅ Attendance persists in the database and is retrievable by Organisers
- ✅ Organiser can edit any curriculum session and see change on public page
- ✅ Organiser can post an announcement that displays on the home page
- ✅ Organiser can export member roster as CSV
- ✅ Privacy page published at `/privacy`
- ✅ Sign-out works

### Phase 3 — Rich Member Experience (Q3 2026)
- ✅ Role management UI replaces code allowlist
- ✅ Session recordings gallery (YouTube unlisted) for Members
- ✅ Sadhana tracker (rounds, reading, etiquette) for Members
- ✅ Speaker self-nomination form + Organiser approval
- ✅ Weekly email digest
- ✅ Private kids' content

## 12. Explicitly Deferred (Phase 4+)

- Multi-language (Hindi)
- Donations / payments
- Comments / discussions
- Search
- Native mobile app

---

**End of requirements draft v2.**

Open questions OQ-1 through OQ-12 still need answers from you. The unblocker set for **today's Phase 1 launch** is OQ-1, OQ-2, OQ-3, OQ-4. The rest can wait.
