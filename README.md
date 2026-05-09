# Bhakti Vriksha Radha Madan Mohan — Website

Next.js 14 site for the Sunday Bhakti Vriksha program. Public marketing pages today; member portal (Google login + self-attendance) and organiser tools in progress.

Deployed on Vercel. Source of truth is this GitHub repo.

---

## Quick start (local development)

```bash
npm install
npm run dev
# open http://localhost:3000
```

Requires Node 18+. Build verification:

```bash
npm run build
```

## Edit content (no code required for the common cases)

- **32-week schedule:** `data/schedule.ts` (the `schedule` export)
- **Speaker roster:** same file, `speakers` export
- **Home page copy:** `app/page.tsx`
- **About / teacher bios:** `app/about/page.tsx`
- **Resource links:** `app/resources/page.tsx`
- **Contact, venue, emails, WhatsApp:** `app/contact/page.tsx`
- **Registration copy:** `app/register/page.tsx` (swap the "contact to register" block for a Google Form iframe when the form URL is available)

After editing, commit and push to `main`; Vercel redeploys automatically.

## Environment variables

When Phase 2 (auth + database) is enabled, copy `.env.local.example` to `.env.local` and fill in:

- `NEXTAUTH_URL` — locally `http://localhost:3000`, in production your Vercel URL
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud OAuth Console
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)

On Vercel, add these under *Project Settings → Environment Variables*.

## Deploy to Vercel

1. Push this repo to GitHub (done: `anchaliitkgp/bhakti-vriksha-site`)
2. Sign in at [vercel.com](https://vercel.com) with GitHub
3. *Add New → Project →* import the repo
4. Vercel auto-detects Next.js; accept the defaults
5. Add environment variables (see above) when Phase 2 is ready
6. Deploy

Every push to `main` redeploys automatically. Pull requests get preview deploys.

## Project structure

```
app/
  page.tsx                  home
  about/                    about the program
  curriculum/               32-week schedule (reads data/schedule.ts)
  speakers/                 L1–L4 speaker roster (reads data/schedule.ts)
  resources/                curated external links
  gallery/                  placeholder grid (real photos later)
  register/                 registration (contact-based until form URL)
  contact/                  coordinator + venue + WhatsApp
  layout.tsx                shared layout (Navbar + Footer)
  opengraph-image.tsx       auto-generated OG image for link previews
  sitemap.ts                generated /sitemap.xml
  robots.ts                 generated /robots.txt
  not-found.tsx             branded 404
components/
  Navbar.tsx                sticky top nav with mobile hamburger
  Footer.tsx                purple footer
data/
  schedule.ts               Session + Speaker typed data (edit here)
.kiro/
  specs/bhakti-vriksha-website/   requirements, design, tasks
  steering/                       personal-context + project-preferences
```

## Phases

- **Phase 1 — Public site** (live today). Eight public pages, no login.
- **Phase 2 — Members & Organisers.** Google OAuth (NextAuth), Supabase Postgres, member dashboard, self-attendance (day-of only), organiser curriculum editing.
- **Phase 3 — Rich member experience.** Role management UI, recordings, sadhana tracker, speaker self-nomination, email digest.

See `.kiro/specs/bhakti-vriksha-website/requirements.md` for the full spec.
