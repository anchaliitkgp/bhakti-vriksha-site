# Testing Guide — Bhakti Vriksha Site

Haribol Prabhu 🙏 This guide walks you through every flow (guest, member, organiser, manager) so you can fully test the site before sharing it with devotees.

**Live URLs:**
- **Production:** https://bhakti-vriksha.vercel.app
- **Dev (for safe testing):** `npm run dev` → http://localhost:3000

**Important:** Do all risky testing on **dev** (your laptop), not prod. Dev hits the dev Supabase project (`zvwisehlrojssbeqzhrz`), so test data doesn't pollute real registrations.

---

## Quick start

```bash
cd bhakti-vriksha-site
npm run dev
# Browser opens at http://localhost:3000
```

---

## 1. The three role experiences — without swapping Google accounts

You can test every role as **yourself** (anchaliitkgp@gmail.com) using the `?as=` override. This only works because you are the hardcoded Manager in `lib/auth/roles.ts` and only in dev (it's silently ignored in production).

**Sign in first as anchaliitkgp@gmail.com**, then:

| URL | What you experience |
|---|---|
| http://localhost:3000/member | Manager view (normal) |
| http://localhost:3000/member?as=organiser | Same page rendered as if you were an Organiser |
| http://localhost:3000/member?as=member | Same page rendered as if you were a regular Member |
| http://localhost:3000/member?as=guest | Same page rendered as if you were a guest |

A **yellow banner** appears at the top when any `?as=` override is active so you never forget you're in test mode.

Same pattern works on `/admin?as=organiser` etc.

---

## 2. Testing the six main flows

### Flow A — Anonymous visitor (no sign-in)

**What they can do:**
- Browse Home, About, Proposed Curriculum, Actual Schedule, Speakers, Resources, Gallery, Contact
- Register their family via `/register`

**Test steps:**
1. Open http://localhost:3000 in a private/incognito window (so no cookies)
2. Click through every nav item — confirm everything loads
3. Click **Register** → fill the form:
   - Primary: your throwaway Gmail, name, age, gender, marital status, phone
   - Add one secondary (Spouse, age 35, Married)
   - Add one minor (Son, age 10, Single — marital lock should auto-engage when you type `10` in age)
   - Try ticking "Initiated devotee" and leave initiated name blank — Submit should be blocked
   - Tick the consent checkbox at the bottom — Submit enables
   - Click Submit → you see the "Hare Krishna! Your family is registered" confirmation

**What should NOT work:**
- Visiting `/member`, `/admin`, `/admin/registrations`, or `/member/family/edit` → redirects to `/signin`

### Flow B — Signed-in but unregistered family

**Scenario:** someone signs in with a Gmail that isn't in the code allowlist and has no family row yet.

**Test steps:**
1. In an incognito window, visit http://localhost:3000/signin
2. Sign in with a Gmail that has NOT registered (e.g., a second personal account)
3. You should be redirected to **`/signin/unregistered`** with a friendly page pointing to `/register`
4. No `members` row is created for this user (the signIn callback blocks before the upsert)

### Flow C — Pending registration

**Scenario:** a family has submitted registration; an organiser hasn't approved yet.

**Test steps:**
1. In an incognito window, submit a new family via `/register` with a throwaway Gmail
2. Now **sign in** with that same Gmail
3. You should be redirected to **`/signin/pending`** with a friendly "Your registration is pending" page
4. Coordinator contact is listed in case they need to escalate

### Flow D — Approved family member

**Scenario:** your family is approved. You can mark attendance + edit your family.

**Test steps:**
1. Submit a family via `/register` with a throwaway Gmail
2. Sign in as you (`anchaliitkgp@gmail.com`)
3. Go to `/admin/registrations` → click **Approve** on the pending family (two-step confirm to prevent misclicks)
4. Sign out, sign back in with the throwaway Gmail
5. You land on `/member` with:
   - `Hare Krishna, {Name} and Family!` greeting
   - Family-scope attendance button (one click marks the whole family present)
   - "Edit your family" link in Quick Links
6. Click "Edit your family" → change a phone number → save. No consent re-prompt (cosmetic change).
7. Edit again → change a member's age from 17 to 18 → Submit is blocked with "This change requires you to re-confirm consent" until you tick the consent checkbox.

### Flow E — Organiser (approve / reject / reopen)

**Scenario:** HG Mahaprema Prabhu is reviewing the approval queue.

**Test steps (using the `?as=organiser` override as yourself):**
1. http://localhost:3000/admin/registrations?as=organiser
2. The tabs show live counts: `Pending (n)`, `Approved (n)`, `Rejected (n)`
3. **Approve** — click the Approve button, then Confirm. Row slides out, pending count decrements.
4. **Reject** — click Reject, type a reason (0–280 chars), Confirm. Row slides out.
5. Switch to the **Rejected** tab — click **Reopen** on a rejected family → row moves back to Pending.
6. Click "View full details" on any row → opens a detail panel showing every member + audit history timeline.

### Flow F — Manager (you)

You have everything Organisers have, plus the Manager badge and the two dev overrides:
- `?as=member|organiser|manager` on any member or admin URL
- `?today=2026-05-31` to simulate a different date (useful for testing Sunday-only attendance)

---

## 3. Dev-only date override — test Sunday attendance on any day

Because attendance can only be marked on the actual session day (IST), you can't just click the button on a Tuesday and have it work. Use the `today` override instead:

http://localhost:3000/member?today=2026-05-31 → pretends today is Sunday 31 May 2026 (Week 1)

A yellow banner shows the override is active. You can now click "Mark attendance for Week 1" and the server will accept it because:
- You're the Manager (only Manager gets this override)
- You're in dev (`NODE_ENV !== "production"`)

Combine with `?as=member` to test family attendance as a regular family would see it.

---

## 4. Register Mahaprema Prabhu & Vinita Mataji & speakers

**They all register through the normal `/register` flow.** No special admin page needed.

**Step by step for each:**

1. They go to https://bhakti-vriksha.vercel.app/register from their phone
2. Fill out the form with their own details + any family members
3. Submit — it goes to Pending
4. You (as Manager) approve from `/admin/registrations`
5. They sign in with Gmail — land on their `/member` dashboard
6. Their **Organiser role is preserved** because the hardcoded `ROLE_ALLOWLIST` in `lib/auth/roles.ts` always wins over the DB-backed allowlist

**Current allowlist (in `lib/auth/roles.ts`):**
```typescript
"anchaliitkgp@gmail.com": "manager",
"mahendra.prajapat@gmail.com": "organiser",  // Mahaprema Prabhu
// TODO: add vinita mataji's email when provided
```

Once Vinita Mataji shares her Gmail, add it to this allowlist, commit, push — she'll see the Organiser badge on her next sign-in.

**For speakers** (Shekhar Verma, Anu Nehra, etc.): they register as regular Members. If you want any of them to also be an Organiser (edit curriculum, see the registration queue), add their Gmail to `ROLE_ALLOWLIST` the same way.

---

## 5. The Register-Family nudge banner

If a signed-in Organiser or Member does NOT have a family row yet, `/member` and `/admin` now show a saffron banner asking them to register. This was added specifically so:
- Mahaprema Prabhu will see the nudge when he first signs in as Organiser
- Speakers will see it when they sign in as Members (after you add them to the allowlist)

---

## 6. Useful SQL queries for debugging

Sign into [Supabase Studio](https://supabase.com/dashboard/project/zvwisehlrojssbeqzhrz/editor) (dev) or [prod](https://supabase.com/dashboard/project/paeetsgehvhahaibmpsj/editor), then open the SQL editor.

```sql
-- Who has registered a family?
SELECT f.status, f.primary_email, f.submitted_at,
       f.approved_at, f.rejected_at,
       count(fm.id) AS member_count
FROM families f
LEFT JOIN family_members fm ON fm.family_id = f.id
GROUP BY f.id
ORDER BY f.submitted_at DESC;

-- The live DB allowlist (who can sign in as a member today)
SELECT * FROM approved_family_emails ORDER BY email;

-- Audit trail for a specific family
SELECT action, actor_email, actor_role, occurred_at, note, diff
FROM family_audit_log
WHERE family_id = '...'
ORDER BY occurred_at DESC;

-- Who marked attendance this Sunday?
SELECT s.date, s.title, a.member_id, m.email, a.marked_at
FROM attendance a
JOIN sessions s ON s.week = a.session_week
JOIN members m ON m.id = a.member_id
WHERE s.date = CURRENT_DATE;

-- Family attendance for this Sunday
SELECT s.date, s.title, fa.family_id, f.primary_email, fa.marked_at
FROM family_attendance fa
JOIN sessions s ON s.week = fa.session_week
JOIN families f ON f.id = fa.family_id
WHERE s.date = CURRENT_DATE;
```

---

## 7. Cleaning up dev test data

If dev Supabase accumulates test families, clean up with:

```sql
-- View test families
SELECT id, primary_email, status FROM families
WHERE primary_email ILIKE '%example.com%' OR primary_email ILIKE '%test%';

-- Nuke them (cascades to members + events + attendance)
SELECT delete_family(id, null)
FROM families
WHERE primary_email ILIKE '%example.com%' OR primary_email ILIKE '%test%';
```

Prod should be clean — never delete real families except through the admin UI.

---

## 8. What to test before announcing the site to the wider sanga

Quick smoke test checklist:

- [ ] Sign in as yourself on prod → Manager badge visible, /admin card shows pending count
- [ ] Register a throwaway family on prod via `/register`
- [ ] Approve it from `/admin/registrations`
- [ ] Sign out, sign in with the throwaway Gmail → "and Family" greeting visible
- [ ] Edit the family, change a phone number → no re-consent prompt
- [ ] Edit again, change an age → re-consent prompt appears
- [ ] Reject a pending family with a reason → moves to Rejected tab
- [ ] Reopen the rejected family → moves back to Pending
- [ ] Delete the throwaway family from Supabase SQL editor (for cleanup)

If all ten pass, you're ready to send the registration link to devotees.

---

## Need something else?

Things not yet tested automatically that may be worth checking once:
- **Family scope attendance on a real Sunday** — only testable on the actual session day without the `?today=` override
- **Google OAuth popup behaviour on mobile Safari** — nothing custom here but worth a once-over
- **Approval email notifications** — not yet implemented (Phase 2)

Ask me if anything needs expanding.
