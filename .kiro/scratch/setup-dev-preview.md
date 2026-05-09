# Setting up the dev preview URL — one-time setup

This guide walks you through the three things you need to do in Vercel +
Google OAuth so the `dev` branch deploys as a fully-isolated preview
pointing at dev Supabase.

Once done, every push to the `dev` branch auto-deploys and nothing touches
prod data.

---

## 1. Vercel env vars — scope dev values to the Preview + dev branch

You're already logged in. The page that just opened is:
**Vercel → bhakti-vriksha-site → Settings → Environment Variables**

For each of the six env vars below, you'll click **Add New** (or **Edit**
if it already exists), scope it to **Preview → Git Branch → `dev`**, and
paste the dev value.

Dev Supabase project (for copy-paste):
- Project ref: `zvwisehlrojssbeqzhrz`
- URL:         `https://zvwisehlrojssbeqzhrz.supabase.co`
- Service-role key: look it up at
  https://supabase.com/dashboard/project/zvwisehlrojssbeqzhrz/settings/api
  (bottom of the page, under "service_role secret")

The six variables:

| Name | Dev value | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zvwisehlrojssbeqzhrz.supabase.co` | Preview → Branch `dev` |
| `SUPABASE_SERVICE_ROLE_KEY` | (paste from Supabase dashboard) | Preview → Branch `dev` |
| `NEXT_PUBLIC_SITE_URL` | `https://bhakti-vriksha-site-git-dev-anchal-nema-s-projects.vercel.app` | Preview → Branch `dev` |
| `NEXTAUTH_URL` | `https://bhakti-vriksha-site-git-dev-anchal-nema-s-projects.vercel.app` | Preview → Branch `dev` |
| `NEXTAUTH_SECRET` | (generate fresh — see below) | Preview → Branch `dev` |
| `GOOGLE_CLIENT_ID` | (same as prod is OK, or a separate dev client) | Preview → Branch `dev` |
| `GOOGLE_CLIENT_SECRET` | (matches the GOOGLE_CLIENT_ID above) | Preview → Branch `dev` |

### Generating NEXTAUTH_SECRET for dev

Run this locally and paste the output as the dev value (don't share, don't
reuse prod's secret):

```bash
openssl rand -base64 32
```

### Tip

Vercel shows env vars scoped per environment. Make sure:
- **Production** still has your prod Supabase + prod URL values
- **Preview → Branch `dev`** gets the dev values above
- Other preview branches (if any) inherit the defaults — that's fine, they
  won't exist unless you create more branches

---

## 2. Google OAuth — add the dev URL as an allowed redirect

Your Google OAuth client currently only permits the prod callback. The dev
URL needs its own callback registered, or sign-in will fail with
"redirect_uri_mismatch".

**Open:** https://console.cloud.google.com/apis/credentials
(pick the project you used when setting up the OAuth client)

Click your OAuth 2.0 Client ID → scroll to **Authorized redirect URIs** →
**Add URI** → paste:

```
https://bhakti-vriksha-site-git-dev-anchal-nema-s-projects.vercel.app/api/auth/callback/google
```

If the URL has a different suffix (Vercel sometimes generates a slightly
different hash), you can check the exact URL after the first dev deploy
completes — the Vercel dashboard shows it.

---

## 3. Supabase dev — add the dev URL to redirect allowlist

Supabase auth has its own redirect allowlist (separate from OAuth's).

**Open:** https://supabase.com/dashboard/project/zvwisehlrojssbeqzhrz/auth/url-configuration

Add both URLs to the "Redirect URLs" list:
- `https://bhakti-vriksha-site-git-dev-anchal-nema-s-projects.vercel.app/**`
- `http://localhost:3000/**` (for `npm run dev` — may already be there)

Set **Site URL** to the dev URL too if you haven't already:
- `https://bhakti-vriksha-site-git-dev-anchal-nema-s-projects.vercel.app`

---

## 4. Trigger a fresh deploy

After the env vars are saved, redeploy dev so the new vars take effect:

Option A — from Vercel:
- **Deployments** tab → find the latest `dev` build → click **…** → **Redeploy**

Option B — from your terminal:
```bash
cd bhakti-vriksha-site
git checkout dev
git commit --allow-empty -m "chore: trigger dev redeploy with new env vars"
git push
```

Once the build succeeds, the dev URL is live.

---

## 5. Verify the split

Open both URLs side by side and look at the footer:

- **Prod:** https://bhakti-vriksha.vercel.app
- **Dev:**  https://bhakti-vriksha-site-git-dev-anchal-nema-s-projects.vercel.app

Quick sanity test:

1. Register a throwaway family on **dev** via `/register`
2. Check [dev Supabase → Table Editor → families](https://supabase.com/dashboard/project/zvwisehlrojssbeqzhrz/editor) — row should be there
3. Check [prod Supabase → Table Editor → families](https://supabase.com/dashboard/project/paeetsgehvhahaibmpsj/editor) — should NOT be there

If the row appears in prod, something is wrong — paste the output here and
I'll help debug.

---

## How you use it day-to-day

- You're now always on the `dev` branch locally. All test commits go there.
- `npm run dev` (local) → dev Supabase (uses `.env.dev.local` already).
- `git push` from `dev` → Vercel deploys to the dev preview URL → dev
  Supabase.
- When dev is stable and you want to ship, merge `dev` into `main`:

```bash
git checkout main
git merge dev
git push
# Vercel auto-deploys main -> prod
```

- If you want to live-test a specific feature in prod-like conditions
  without pushing to main, just use the dev preview URL — it's production
  in every way except it points at dev Supabase.

---

## If the auto-generated Vercel URL looks different

Vercel's preview URL pattern is:
```
bhakti-vriksha-site-git-<branch>-<team-slug>.vercel.app
```

After the first dev deploy, check the Deployments tab for the actual URL
and update steps 1–3 above to match it. Yours should be
`bhakti-vriksha-site-git-dev-anchal-nema-s-projects.vercel.app` based on
your team slug (`anchal-nema-s-projects`), but confirm before updating
Google OAuth + Supabase URL allowlists.
