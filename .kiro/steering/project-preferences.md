---
inclusion: always
---

# Project Preferences — Bhakti Vriksha Website

## What this project is

A 32-week Sunday program website for **Bhakti Vriksha Radha Madan Mohan** — an ISKCON-inspired family sanga program. The site informs prospective families, shows the weekly schedule, lists speakers, and will eventually host a member portal + sadhana tracker.

## Tech stack (chosen, do not re-debate without asking)

- **Framework:** Next.js 14 (App Router) — we will NOT move to Remix/Astro/plain HTML
- **Language:** TypeScript
- **Styling:** Tailwind CSS with a custom saffron + krishna-purple palette
- **Hosting:** Vercel (free tier)
- **Source control:** GitHub at `anchaliitkgp/bhakti-vriksha-site`, SSH auth
- **Auth (future):** Vercel-compatible — NextAuth.js or Clerk when we add login
- **Data (future):** Supabase (Postgres) or similar Vercel-friendly DB

## What we will NOT use

- AWS Amplify (we evaluated and chose Vercel for simpler free tier, no card required)
- Cognito / DynamoDB / S3 / Lambda
- WordPress / any PHP stack
- jQuery / plain HTML sites

## File/folder conventions

- Pages live in `app/<route>/page.tsx`
- Shared UI in `components/`
- Data (schedule, speakers, etc.) in `data/*.ts` as typed exports
- Tailwind classes inline; no separate CSS files except `app/globals.css`
- New pages get added to the navbar list in `components/Navbar.tsx`

## Design language

- Colors: saffron (gold) and krishna (deep purple) as brand; white/off-white base
- Imagery: `ॐ` symbol, 🪔 lamps, tulsi, simple devotional motifs
- Typography: Inter (sans-serif), Georgia (serif for titles)
- Mood: warm, welcoming, family-oriented; not flashy, not corporate

## Communication style

- Speak to me as a CS engineer who is **new to React/Next.js/TypeScript**
- Explain concepts with small examples pulled from our actual code, not textbook definitions
- Avoid unnecessary abstraction; prefer concrete steps
- When proposing architecture changes, include the tradeoff explicitly (why this vs the alternative)

## Spec-driven workflow

We build features using Kiro specs — requirements → design → tasks. Do not implement anything beyond the stated task without asking.

## Safety

- Never commit Personal Access Tokens, passwords, API keys, or `.env` files
- Always prefer SSH over HTTPS for git operations
- Respect kids' privacy: any photo handling must default to private/auth-gated
