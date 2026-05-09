# Implementation Tasks — Family Registration (Phase 1)

**Parent spec:** [`bhakti-vriksha-website`](../bhakti-vriksha-website/)
**Design:** [`design.md`](./design.md) · **Requirements:** [`requirements.md`](./requirements.md)
**Scope:** FR-01 through FR-13 + NFR-FR-1…7, matching design §1–§19
**Order:** top-to-bottom; migrations first, then code, then tests, then prod rollout
**Convention:** `[ ]` = not started · `[-]` = in progress · `[x]` = complete · `[~]` = queued

---

## Execution reminders (read before starting)

1. **Dev first, prod only after sign-off.** Apply every migration to the dev Supabase project and run the §15.1 manual test matrix before touching prod (design §16.4).
2. **Migrations are applied via `node supabase/apply-migrations.mjs`** with `SUPABASE_DB_URL` pointing at the target DB. Every `.sql` file is idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`) matching the parent spec's convention.
3. **Every task ends with `npm run build` passing** in `bhakti-vriksha-site/`. For tasks that change runtime behaviour, also spot-check `npm run dev` (uses `.env.dev.local` automatically) before moving on.
4. **Never commit `.env.dev.local` or `.env.prod.local`** — both are gitignored.
5. **Commit at group boundaries, not per task.** Each group below ends with a commit task — use a `feat(family-registration): ...` message summarising the whole group.
6. **Do not touch** — these are explicit no-go zones for this spec:
   - The existing `attendance` table (003) — we add a sibling `family_attendance`, we do not extend the old one (design §5.4, D1).
   - The hardcoded entries in `ROLE_ALLOWLIST` in `lib/auth/roles.ts` — they stay as the override layer above the DB-backed allowlist (design D18, FR-07.4).
   - Existing RLS policies in `005_rls.sql` — new policies live in `012_families_rls.sql` and mirror the same style.
7. **Property thinking, even without PBT.** Where a task implements a state transition, a version bump, an invariant CHECK, or an enum-narrowed field, the task description names the invariant. If implementation feels like it's bending the invariant, stop and ask.

---

## Group 1 — Database migrations (007–014)

- [x] 1. Author `007_families.sql` — `families` table + consent CHECK
- [x] 2. Author `008_family_members.sql` — `family_members` + enums + size trigger
- [x] 3. Author `009_family_events.sql` — `family_events` + month/day index
- [x] 4. Author `010_family_attendance.sql` — new sibling table, `attendance` untouched
- [x] 5. Author `011_family_audit_log.sql` — append-only audit table + triggers
- [x] 6. Author `012_families_rls.sql` — RLS policies + `approved_family_emails` view
- [x] 7. Author `013_families_rpcs.sql` — state-transition RPCs with optimistic concurrency
- [x] 8. Author `014_effective_attendance.sql` — UNION view for de-dup
- [x] 9. Apply migrations 007–014 to **dev Supabase**
- [x] 10. Checkpoint — ensure the DB schema is correct before any code changes

## Group 2 — Auth model changes (DB-backed allowlist bridge)

- [x] 11. Create `lib/auth/db-allowlist.ts` — `isApprovedFamilyEmail(email)` helper
- [x] 12. Convert `roleFor()` in `lib/auth/roles.ts` to async
- [x] 13. Extend the `signIn` callback to gate Pending / Rejected / Unregistered
- [x] 14. Add three new static signin pages
- [x] 15. Checkpoint — verify signin gating works end-to-end on dev

## Group 3 — API routes (family lifecycle + attendance scope extension)

- [x] 16. Create `lib/family/validation.ts` — shared Zod schemas
- [x] 17. Create `lib/family/material-change.ts` — `isMaterialChange(before, after)`
- [x] 18. Implement `POST /api/family/register`
- [x] 19. Implement `POST /api/family/[id]/approve`
- [x] 20. Implement `POST /api/family/[id]/reject` and `POST /api/family/[id]/reopen`
- [x] 21. Implement `PUT /api/family/[id]` (Primary edit path)  + migration 015 (edit_family RPC)
- [x] 22. Extend `POST /api/attendance/mark` with a `scope` field
- [x] 23. Update `middleware.ts` to guard new admin and API routes
- [x] 24. Checkpoint — verify API contract on dev

## Group 4 — Shared `<FamilyRegistrationForm>` and subcomponents

- [x] 25. Create `components/ConsentGate.tsx`
- [x] 26. Create `components/FamilyMemberBlock.tsx`
- [x] 27. Create `components/FamilyRegistrationForm.tsx` — the shared form
- [x] 28. Create `components/FamilyDetailPanel.tsx`
- [x] 29. Create `components/FamilyQueueList.tsx`
- [x] 30. Checkpoint — form and queue components render in isolation

## Group 5 — Pages (wire components into routes)

- [x] 31. Rewrite `app/register/page.tsx` to render the structured form
- [x] 32. Create `app/admin/registrations/page.tsx`
- [x] 33. Create `app/member/family/edit/page.tsx`
- [x] 34. Update `app/member/page.tsx` — family greeting + Edit-family link + family attendance button
- [x] 35. Update `components/AttendanceButton.tsx` to accept `scope` prop
- [x] 36. Update `components/Navbar.tsx` — no change needed (admin nav already routes via /admin which now points at /admin/registrations)
- [x] 37. Update `app/admin/page.tsx` — link to `/admin/registrations` and surface pending count
- [ ] 38. Checkpoint — full happy path on dev

---

## Group 6 — Manual test matrix on dev (design §15.1)

- [ ] 39. Test scenarios 1–6 — registration form validation
- [ ] 40. Test scenarios 7–10 — approval flow + concurrency
- [ ] 41. Test scenarios 11–12 — family attendance + dedup
- [ ] 42. Test scenarios 13–16 — edit flow + state machine
- [ ] 43. Test scenarios 17–20 — invariants + guards + performance
- [ ] 44. Checkpoint — dev sign-off

---

## Group 7 — Production rollout

- [ ] 45. Apply migrations 007–015 to **prod Supabase**
- [ ] 46. Deploy to Vercel prod
- [ ] 47. Smoke-test prod with a throwaway Gmail
- [ ] 48. Final checkpoint — announce and close out
