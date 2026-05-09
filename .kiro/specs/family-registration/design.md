# Design — Family Registration (Phase 1)

**Status:** Draft v1
**Owner:** Anchal Nema
**Parent spec:** [`bhakti-vriksha-website`](../bhakti-vriksha-website/design.md)
**Last updated:** 2026-05-09

---

## 1. Scope

Phase 1 of family-registration: structured `/register` form, Organiser approval queue at `/admin/registrations`, DB-backed extension of the Role_Allowlist, family-level attendance, primary-edits-family flow, and a durable audit log. Everything in requirements §4. **Deferred to Phase 2:** celebrations UI, automated approve/reject emails, photo uploads, per-secondary differentiated login, bulk approve. Those are called out where they matter but not designed here.

## 2. Technology stack

Inherited unchanged from parent design §2 — Next.js 14 App Router, TypeScript strict, Tailwind, NextAuth v4 Google JWT, Supabase Postgres with RLS, Vercel. No new runtime dependencies. No new env vars.

## 3. High-level architecture

Request flow for the four primary paths:

```text
┌── Path A: Family registration submission ─────────────────────────────┐
│                                                                       │
│  Browser (app/register)                                                │
│    │ POST /api/family/register { primary, members[], events[], consent}│
│    ▼                                                                  │
│  Vercel Route Handler ── validates ──► Supabase (service role)         │
│    │                                     │                            │
│    │                                     ├─► families (status=Pending)│
│    │                                     ├─► family_members           │
│    │                                     ├─► family_events            │
│    │                                     ├─► family_consent (1 row)   │
│    │                                     └─► family_audit_log (1 row) │
│    ◄─────────────────── 201 { familyId }                              │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌── Path B: Organiser approval ─────────────────────────────────────────┐
│                                                                       │
│  Browser (app/admin/registrations)                                    │
│    │ POST /api/family/[id]/approve                                    │
│    ▼                                                                  │
│  Route Handler ── session+role guard ──► Supabase RPC                 │
│    │                                       └─► approve_family(id):    │
│    │                                            • optimistic version  │
│    │                                              check on families   │
│    │                                            • UPDATE families     │
│    │                                              SET status=Approved │
│    │                                            • REFRESH allowlist   │
│    │                                              view (automatic)    │
│    │                                            • INSERT audit row    │
│    ◄───────── 200 { status: "Approved" }  (or 409 if conflict)        │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌── Path C: Primary sign-in after approval ─────────────────────────────┐
│                                                                       │
│  Browser  ── Google OAuth ──►  NextAuth callback chain                │
│                                  │                                    │
│                                  │ 1. signIn() callback:              │
│                                  │    lookup family_status(email)     │
│                                  │    • Approved  → continue          │
│                                  │    • Pending   → redirect /pending │
│                                  │    • Rejected  → redirect /rejected│
│                                  │    • NULL      → existing flow     │
│                                  │                                    │
│                                  │ 2. jwt() callback: roleFor(email)  │
│                                  │    (now consults code + DB allowlist)│
│                                  │                                    │
│                                  └──► members upsert (unchanged)       │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌── Path D: Family-level attendance ────────────────────────────────────┐
│                                                                       │
│  Browser (app/member, primary session)                                │
│    │ POST /api/attendance/mark { week, scope:"family" }               │
│    ▼                                                                  │
│  Route Handler ── IST date + session check ──► Supabase               │
│                                                 │                     │
│                                                 ├─► family_attendance │
│                                                 │   unique(family,wk) │
│                                                 │                     │
│                                                 └─► NO write to the   │
│                                                     existing          │
│                                                     attendance table  │
│                                                                       │
│  Secondary with own Gmail hits the same endpoint with scope:"self"    │
│  which writes to the existing attendance table. De-dup for counting   │
│  is resolved by a UNION view at read time — see §12.                  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## 4. State machine for Family.status

Requirements left OQ-FR-5 open: can Approved → Rejected? Can Rejected → Pending?

**Decision:** All three forward transitions are allowed; Approved → Rejected **is** allowed (with an audit entry), so an Organiser who approved a spam registration in error can clean up without a DB edit. Approved → Pending is **not** allowed — reverting to pending-review is not a real workflow need, and disallowing it simplifies the allowlist refresh semantics.

```text
        ┌──────────┐   approve   ┌──────────┐
        │ Pending  ├────────────►│ Approved │
        │          │             │          │
        │          │◄────────────┤          │
        │          │   reopen    │          │
        │          │             │          │
        │          │   reject    │          │
        │          ├──────────┐  └────┬─────┘
        └──────────┘          │       │
              ▲               ▼       │ reject (reverse)
              │         ┌──────────┐  │
              └─────────┤ Rejected │◄─┘
                 reopen │          │
                        └──────────┘

 Allowed:   Pending→Approved, Pending→Rejected, Rejected→Pending,
            Approved→Rejected
 Forbidden: Approved→Pending
```

All transitions are guarded by a Postgres CHECK constraint plus a helper function `assert_family_transition(old, new)` enforced by the `approve_family` / `reject_family` / `reopen_family` RPCs. Direct UPDATE of `families.status` by application code is blocked by an RLS INSTEAD-OF trigger and by code convention (only RPCs mutate status).

## 5. Data model

Migrations numbered 007 onwards, matching the existing 001-006 convention.

### 5.1 `families` (007_families.sql)

```sql
CREATE TYPE family_status AS ENUM ('Pending', 'Approved', 'Rejected');

CREATE TABLE families (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status            family_status NOT NULL DEFAULT 'Pending',
  primary_email     TEXT NOT NULL,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES members(id) ON DELETE SET NULL,
  rejected_at       TIMESTAMPTZ,
  rejected_by       UUID REFERENCES members(id) ON DELETE SET NULL,
  rejection_reason  TEXT CHECK (rejection_reason IS NULL OR length(rejection_reason) <= 280),
  consent_given     BOOLEAN NOT NULL DEFAULT false,
  consent_at        TIMESTAMPTZ,
  version           INT NOT NULL DEFAULT 1,   -- optimistic concurrency token
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- FR-12.4: primary email unique across ALL statuses
  CONSTRAINT families_primary_email_unique UNIQUE (primary_email),

  -- FR-12.7: actor + timestamp are set together
  CONSTRAINT families_approved_pair
    CHECK ((approved_at IS NULL) = (approved_by IS NULL)),
  CONSTRAINT families_rejected_pair
    CHECK ((rejected_at IS NULL) = (rejected_by IS NULL)),

  -- FR-13.3/6: no persisted row without consent
  CONSTRAINT families_consent_required
    CHECK (consent_given = true AND consent_at IS NOT NULL)
);

CREATE INDEX idx_families_status ON families (status)
  WHERE status = 'Pending';  -- partial index; queue is the hot path
CREATE INDEX idx_families_primary_email ON families (lower(primary_email));
CREATE INDEX idx_families_submitted_at ON families (submitted_at);
```

Note on consent: I considered a separate `family_consent` table but kept consent on `families` because (a) Phase 1 captures a single consent event, (b) the CHECK constraint is the simplest way to enforce "no family row without consent" per FR-13.6, and (c) re-consent on edits is a single timestamp update, not a history. If Phase 2 needs a full consent history (e.g., GDPR-style withdraw/renew), we add a `family_consent_events` table then and keep the latest timestamp denormalised on `families`.

### 5.2 `family_members` (008_family_members.sql)

```sql
CREATE TYPE member_kind AS ENUM ('Primary', 'Secondary');
CREATE TYPE member_gender AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE member_marital AS ENUM ('Married', 'Single');
CREATE TYPE member_relationship AS ENUM (
  'Self', 'Spouse', 'Son', 'Daughter',
  'Mother', 'Father', 'Sister', 'Brother', 'Other'
);

CREATE TABLE family_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  kind                member_kind NOT NULL,
  given_name          TEXT NOT NULL CHECK (length(btrim(given_name)) BETWEEN 1 AND 120),
  initiated           BOOLEAN NOT NULL DEFAULT false,
  initiated_name      TEXT,
  relationship        member_relationship NOT NULL,
  relationship_other  TEXT,  -- populated only when relationship = 'Other'
  age                 INT NOT NULL CHECK (age BETWEEN 0 AND 120),
  gender              member_gender NOT NULL,
  marital_status      member_marital NOT NULL,
  email               TEXT,
  phone               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- FR-02.9: initiated name is required when initiated
  CONSTRAINT fm_initiated_name_when_initiated CHECK (
    (initiated = false) OR
    (initiated_name IS NOT NULL AND length(btrim(initiated_name)) > 0)
  ),

  -- FR-02.3: 'Other' relationship requires a label, max 40 chars
  CONSTRAINT fm_relationship_other_label CHECK (
    (relationship <> 'Other' AND relationship_other IS NULL) OR
    (relationship = 'Other'
      AND relationship_other IS NOT NULL
      AND length(btrim(relationship_other)) BETWEEN 1 AND 40)
  ),

  -- FR-12.1: Primary must have relationship = 'Self'
  CONSTRAINT fm_primary_self CHECK (
    (kind = 'Secondary') OR (kind = 'Primary' AND relationship = 'Self')
  ),

  -- FR-12.3: age < 18 forces marital_status = 'Single' at the persistence layer
  CONSTRAINT fm_minor_is_single CHECK (
    (age >= 18) OR (marital_status = 'Single')
  )
);

-- FR-12.1: exactly one Primary per family (functional unique index)
CREATE UNIQUE INDEX uq_family_one_primary
  ON family_members (family_id)
  WHERE kind = 'Primary';

-- FR-12.5: at most 16 members per family — enforced by trigger below
CREATE OR REPLACE FUNCTION enforce_family_size() RETURNS trigger AS $$
BEGIN
  IF (SELECT count(*) FROM family_members WHERE family_id = NEW.family_id) > 16 THEN
    RAISE EXCEPTION 'Family % exceeds the 16-member limit', NEW.family_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_enforce_family_size
  AFTER INSERT ON family_members
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_family_size();

CREATE INDEX idx_family_members_family_id ON family_members (family_id);
CREATE INDEX idx_family_members_email ON family_members (lower(email))
  WHERE email IS NOT NULL;
```

Rationale for enum types over plain TEXT + CHECK: the Approval_Queue detail view, the Edit-Family UI, and the DB-backed allowlist view all need to discriminate on these fields. Enums give us stable identifiers, cheap comparisons, and catch typos at insert time. Adding a new relationship value is one migration (`ALTER TYPE member_relationship ADD VALUE '…'`), which is fine for our pace.

### 5.3 `family_events` (009_family_events.sql)

```sql
CREATE TYPE family_event_kind AS ENUM ('DateOfBirth', 'WeddingAnniversary');

CREATE TABLE family_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id  UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  kind              family_event_kind NOT NULL,
  event_date        DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fe_event_date_sane
    CHECK (event_date BETWEEN DATE '1900-01-01' AND CURRENT_DATE + INTERVAL '1 day'),

  -- Each member has at most one DOB and one anniversary
  CONSTRAINT fe_one_per_kind UNIQUE (family_member_id, kind)
);

CREATE INDEX idx_family_events_member_id ON family_events (family_member_id);
-- Phase-2 celebration queries use month+day. Expression index costs us nothing now
-- and saves a table scan when the Phase-2 card lands.
CREATE INDEX idx_family_events_month_day
  ON family_events (EXTRACT(MONTH FROM event_date), EXTRACT(DAY FROM event_date));
```

Events are a separate table (not columns on `family_members`) because (a) Phase 2 will add more event kinds (death anniversaries, vrata-vow dates) and (b) the Phase-2 celebrations UI wants to query by month+day across all event kinds in one scan — a row-per-event schema makes that a `WHERE` filter, not a CASE expression.

### 5.4 `family_attendance` (010_family_attendance.sql) — **resolves OQ-FR-3**

```sql
CREATE TABLE family_attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  session_week  INT  NOT NULL REFERENCES sessions(week) ON DELETE CASCADE,
  marked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_by     UUID REFERENCES members(id) ON DELETE SET NULL,
  head_count    INT, -- nullable, optional future capture of who-was-actually-there
  UNIQUE (family_id, session_week)
);

CREATE INDEX idx_family_attendance_family ON family_attendance (family_id);
CREATE INDEX idx_family_attendance_session ON family_attendance (session_week);
```

**New table, existing `attendance` table untouched.** Justification:
1. Per-member attendance within a family (Phase 2) is additive — a future `family_member_attendance` table references `family_members.id`, and the semantic "family was present" still lives on this table.
2. Organiser mark-on-behalf (Phase 2) is a column update on `marked_by` — no schema change.
3. "Family was absent" reporting (Phase 2) is a LEFT JOIN of `families × sessions` minus `family_attendance`, which is trivially an analytical query.
4. Leaving `attendance` alone preserves the parent spec's RLS policies and all existing reads from the Member dashboard. A `scope` column on `attendance` would have forced rewriting every existing query.

De-dup semantics between `attendance` (individual) and `family_attendance` (family) are resolved by a read-time view — see §12.

### 5.5 `family_audit_log` (011_family_audit_log.sql)

```sql
CREATE TYPE family_audit_action AS ENUM (
  'Create', 'Approve', 'Reject', 'Reopen', 'Edit', 'Delete'
);

CREATE TABLE family_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL,  -- NOT a FK: survives tombstoned families
  actor_id    UUID REFERENCES members(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,  -- denormalised so history survives member deletion
  actor_role  TEXT NOT NULL CHECK (actor_role IN ('member','organiser','manager','system')),
  action      family_audit_action NOT NULL,
  diff        JSONB NOT NULL DEFAULT '{}'::jsonb,
  note        TEXT,   -- e.g. rejection reason
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_audit_family_id ON family_audit_log (family_id, occurred_at DESC);
CREATE INDEX idx_family_audit_actor_id ON family_audit_log (actor_id);
```

**Diff shape (`diff` JSONB):**

```jsonc
// For a composition edit:
{
  "added":   [{ "id": "…", "given_name": "Asha", "relationship": "Daughter", "age": 9 }],
  "removed": [{ "id": "…", "given_name": "Ram" }],
  "changed": [
    { "id": "…", "field": "marital_status", "from": "Single", "to": "Married" },
    { "id": "…", "field": "age", "from": 17, "to": 18 }
  ]
}

// For Approve:
{ "status": { "from": "Pending", "to": "Approved" } }
```

JSONB, not structured columns, because (a) the schema of a "diff" varies by action, (b) admin-queue read-path renders it as a bulleted list — no indexing required, (c) if we ever want field-level history, we index specific JSONB paths with a GIN index later. Append-only is enforced with a trigger that RAISES on UPDATE or DELETE:

```sql
CREATE OR REPLACE FUNCTION fal_no_mutate() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'family_audit_log is append-only'; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fal_no_update BEFORE UPDATE ON family_audit_log
  FOR EACH ROW EXECUTE FUNCTION fal_no_mutate();
CREATE TRIGGER trg_fal_no_delete BEFORE DELETE ON family_audit_log
  FOR EACH ROW EXECUTE FUNCTION fal_no_mutate();
```

Tombstone rule (NFR-FR-2.3): when an Organiser hard-deletes a Family, `families` + all children rows are cascade-deleted, and a final `{ action: 'Delete' }` row is inserted into `family_audit_log` capturing the last-known primary email and family composition summary. Because `family_id` is not a FK, the tombstone survives.

### 5.6 DB-backed allowlist — materialised view (012_families_rls.sql)

**Decision: Postgres view, not a materialised table, not an ad-hoc query.**

```sql
CREATE VIEW approved_family_emails AS
SELECT
  lower(f.primary_email) AS email,
  f.id                   AS family_id,
  'primary'::text        AS source
FROM families f
WHERE f.status = 'Approved'
UNION ALL
SELECT
  lower(fm.email),
  fm.family_id,
  'secondary'::text
FROM family_members fm
JOIN families f ON f.id = fm.family_id
WHERE f.status = 'Approved'
  AND fm.kind = 'Secondary'
  AND fm.email IS NOT NULL
  AND lower(fm.email) LIKE '%@gmail.com';  -- Gmail-only per Assumption 1
```

Justification:
- A **plain view** gives us transactional correctness for free: when `approve_family` commits, the next `SELECT … FROM approved_family_emails WHERE email = ?` reflects the change immediately, with no refresh step (FR-07.5, NFR-FR-6.2).
- A materialised table would need a refresh trigger on `families` + `family_members`, which adds a failure mode (refresh can fail independently of the state change).
- Per-query evaluation is cheap at our scale (O(hundreds) of approved families × indexed email lookup). If it ever gets slow we swap to a materialised view with `REFRESH MATERIALIZED VIEW CONCURRENTLY` triggered by the RPCs.

The view is consulted from `roleFor()` via a small helper:

```ts
// lib/auth/db-allowlist.ts
export async function isApprovedFamilyEmail(email: string): Promise<boolean> {
  const { data } = await supabaseServer()
    .from("approved_family_emails")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return !!data;
}
```

### 5.7 RLS policies (012_families_rls.sql, continued)

Matches parent `005_rls.sql` style — server writes via service_role bypass; policies provide defense in depth.

```sql
ALTER TABLE families            ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_audit_log    ENABLE ROW LEVEL SECURITY;

-- Organisers + Manager read everything family-related.
DROP POLICY IF EXISTS "families_org_read" ON families;
CREATE POLICY "families_org_read" ON families
  FOR SELECT TO authenticated
  USING (coalesce(auth.jwt() ->> 'role', 'guest') IN ('organiser','manager'));

-- A primary reads their own family by matching email on the primary row.
DROP POLICY IF EXISTS "families_primary_read_own" ON families;
CREATE POLICY "families_primary_read_own" ON families
  FOR SELECT TO authenticated
  USING (lower(primary_email) = lower(coalesce(auth.jwt() ->> 'email','')));

-- Mirror for family_members / family_events: read if org, or if the family
-- matches the signed-in primary.
DROP POLICY IF EXISTS "family_members_read" ON family_members;
CREATE POLICY "family_members_read" ON family_members
  FOR SELECT TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'role', 'guest') IN ('organiser','manager')
    OR EXISTS (
      SELECT 1 FROM families f WHERE f.id = family_id
        AND lower(f.primary_email) = lower(coalesce(auth.jwt() ->> 'email',''))
    )
  );
-- identical policy on family_events and family_attendance (not shown for brevity)

-- Audit log: organiser + manager only. Primaries do not see their own audit trail in Phase 1.
DROP POLICY IF EXISTS "family_audit_org_read" ON family_audit_log;
CREATE POLICY "family_audit_org_read" ON family_audit_log
  FOR SELECT TO authenticated
  USING (coalesce(auth.jwt() ->> 'role', 'guest') IN ('organiser','manager'));

-- All writes go through the service-role key from server code.
-- No INSERT/UPDATE policies defined for any table.
```

## 6. Auth model changes

### 6.1 `roleFor(email)` extension

Becomes async because it consults the DB:

```ts
// lib/auth/roles.ts
export async function roleFor(email: string | null | undefined): Promise<Role> {
  if (!email) return "guest";
  const normalized = email.toLowerCase();

  // 1. Code-based allowlist wins (FR-07.1, FR-07.4).
  const hard = ROLE_ALLOWLIST[normalized];
  if (hard) return hard;

  // 2. DB-backed approved-family allowlist (FR-07.2).
  if (await isApprovedFamilyEmail(normalized)) return "member";

  // 3. Neither allowlist matches (FR-07.3).
  return "guest";
}
```

Synchronous call-sites (there are 3: `jwt()` callback, `/api/attendance/mark`, `app/member/page.tsx` for role badge) get updated to `await roleFor(...)`. The role badge path can fall back to `session.user.role` from the JWT instead of re-querying.

### 6.2 Sign-in callback behaviour

In `lib/auth.ts`, the `signIn` callback gains a family-status short-circuit **before** the `members` upsert:

```ts
async signIn({ user, account }) {
  if (!user.email) return true;
  const email = user.email.toLowerCase();

  // 1. Hard-coded roles always sign in (FR-07.4).
  if (ROLE_ALLOWLIST[email]) {
    await upsertMember(user, account, "manager-or-organiser");
    return true;
  }

  // 2. Check family status. If a family exists and is not Approved, redirect.
  const { data } = await supabaseServer()
    .from("families")
    .select("status")
    .eq("primary_email", email)  // also matches on lower via index
    .maybeSingle();

  if (data?.status === "Pending")  return "/signin/pending";   // FR-04.3
  if (data?.status === "Rejected") return "/signin/rejected";  // FR-04.4

  // 3. No family row and not in code-allowlist: guest (unregistered).
  if (!data && !(await isApprovedFamilyEmail(email))) {
    return "/signin/unregistered";
  }

  // 4. Approved (as primary) or allowlisted-secondary: proceed.
  await upsertMember(user, account, "member");
  return true;
}
```

NextAuth v4 signals a redirect from `signIn` by returning a URL string instead of `true`. The two new pages — `app/signin/pending/page.tsx` and `app/signin/rejected/page.tsx` — render static, reassuring copy with the Coordinator's WhatsApp + email (FR-04.5). An `unregistered` page points to `/register`.

### 6.3 Where the DB lookup happens — latency

**Decision: lookup in `signIn` callback, not on every request.** The `jwt` callback runs on every token refresh and we do not want that to hit the DB. The `signIn` callback runs once at Google-consent time (typically weekly at our scale given the 30-day JWT) — one extra round-trip at sign-in is cheap. The JWT then carries role forward for the life of the token.

Implication: if an Organiser rejects an already-signed-in family, that primary's active session remains valid until their JWT expires (default 30 days). For Phase 1 this is acceptable — rejection is rare and post-hoc. A Phase-2 mitigation is to add a `session_version` on `families` and invalidate JWTs when it changes; not worth the complexity today.

## 7. API surface

All endpoints return JSON. All mutations are wrapped in a Postgres function (RPC) so the state transition, allowlist propagation (automatic via view), and audit write commit in one transaction (NFR-FR-6.2).

### 7.1 `POST /api/family/register`

**Body:**

```jsonc
{
  "primary": {
    "given_name": "Ravi",
    "initiated": true,
    "initiated_name": "Rasaraj Das",
    "age": 38,
    "gender": "Male",
    "marital_status": "Married",
    "email": "ravi@gmail.com",
    "phone": "+91 …",
    "date_of_birth": "1987-04-12",        // optional
    "wedding_anniversary": "2014-01-20"   // optional
  },
  "secondaries": [
    {
      "given_name": "Priya",
      "relationship": "Spouse",
      "initiated": false,
      "age": 35,
      "gender": "Female",
      "marital_status": "Married",
      "email": null,                // same-as-primary → null persisted; UI handles copy-display
      "phone": null,
      "date_of_birth": "1990-08-04",
      "wedding_anniversary": "2014-01-20"
    }
  ],
  "consent": true
}
```

**Validation (server-side, Zod schema):**
- Required fields per FR-01.2 and FR-02.1.
- Primary email unique across all families (FR-12.4).
- Age 0–120; ages < 18 force marital=Single (FR-12.2, FR-12.3).
- Initiated → initiated_name required and non-empty (FR-02.9).
- Relationship=Other → relationship_other 1–40 chars (FR-02.3).
- 0–15 secondaries (FR-02.7).
- consent === true (FR-13.3).

**Responses:**
- `201 { familyId, status: "Pending" }` — happy path.
- `400 { error, field? }` — validation failure, with a `field` pointer when applicable for client-side focus.
- `409 { error: "A family is already registered with this primary email" }` — FR-01.5.
- `500 { error }` — server / DB failure; the client preserves form data (NFR-FR-3.4) and offers retry (FR-01.6).

### 7.2 `POST /api/family/[id]/approve`

**Body:** `{}` (intentionally empty).
**Response success:** `200 { status: "Approved", approvedAt, approvedBy }`.
**Response 409 (concurrent approve):** `{ error: "Already approved by <name> at <time>", status: "Approved" }` — see §14.

Server performs:
1. Role guard (organiser or manager).
2. Call `approve_family(p_family_id UUID, p_actor_id UUID)` RPC which:
   - Asserts current status is Pending OR Rejected (FR-06.6: reopen is permitted for a Rejected family's approval path).
   - Bumps `version`; fails with `P0002` if version check fails (optimistic).
   - Sets `status='Approved', approved_by, approved_at, updated_at`.
   - Writes a `family_audit_log` row with action='Approve' and diff `{status:{from,to}}`.

### 7.3 `POST /api/family/[id]/reject`

**Body:** `{ reason?: string }` (max 280 chars; FR-06.2).
**Response success:** `200 { status: "Rejected", rejectedAt, rejectedBy, reason }`.
**Response 409:** same conflict shape as approve.

Implementation parallels approve. Reason is stored in `families.rejection_reason` AND in the audit `note` column for redundancy.

### 7.4 `POST /api/family/[id]/reopen`

**Body:** `{}`.
**Response success:** `200 { status: "Pending" }`.

Implements FR-06.6 Rejected → Pending. Guarded by role + RPC that asserts current status === 'Rejected'.

### 7.5 `PUT /api/family/[id]`

Primary edit path (FR-10). Role guard requires the caller's email === `families.primary_email` OR role ∈ {organiser, manager}. Body shape mirrors the `POST /register` body but with `members` carrying an `id` for the `changed` and `removed` cases:

```jsonc
{
  "expectedVersion": 7,  // optimistic concurrency
  "primary":  { "id": "…", "…": "…" },      // email is ignored per FR-10.3
  "secondaries": [
    { "id": "…", "_op": "keep",   "…": "…" },
    { "id": "…", "_op": "delete" },
    {           "_op": "create", "…": "…" }
  ],
  "consent_if_material": true  // required per FR-10.8 only when server detects a material change
}
```

Material-change predicate (defines FR-10.8 "material"): any change to member composition (add/remove/id-level role change), any change to `given_name`/`initiated`/`initiated_name`/`age`/`marital_status`/`date_of_birth`/`wedding_anniversary`. **Not material:** changes only to `phone`, `email` (of a secondary), `relationship_other` label. The predicate lives in one pure function `isMaterialChange(before, after)` in `lib/family/material-change.ts` and is also used client-side to decide whether to render the consent checkbox on the edit form — but the server is authoritative (FR-12.6).

Response: `200 { familyId, version }`, or `409` on version mismatch with a safe "reload the page and reapply your edits" message.

### 7.6 `POST /api/attendance/mark` — extended, not split

**Decision: extend the existing endpoint with a `scope` field, not add a parallel `/api/attendance/mark-family`.** Justification: the endpoint is one handler with one set of guard clauses (session auth, IST-day, role, session lookup). Splitting it would duplicate those guards. The handler fans out to the correct table based on scope.

**Body:**

```jsonc
{ "week": 12, "scope": "family" | "self", "today"?: "YYYY-MM-DD" }
```

- `scope: "self"` → existing behaviour, writes to `attendance`.
- `scope: "family"` → requires caller is a primary of an Approved family; writes to `family_attendance`. Rejects with 403 if family is not Approved (FR-08.6).
- If `scope` is omitted, defaults to `"self"` for backward compatibility.

**Idempotency:** both tables carry a unique(subject, session_week). A double-click returns `200 { ok: true, alreadyMarked: true }` without error — same pattern as the existing attendance endpoint.

### 7.7 Error shape (all endpoints)

```jsonc
{ "error": "Human-readable message", "code"?: "VALIDATION|CONFLICT|AUTH|STATE|SERVER", "field"?: "…" }
```

`code` lets the client render field-level UX without parsing the message.

## 8. Pages and components

### 8.1 Pages

| Path | Server/Client | Purpose |
|---|---|---|
| `app/register/page.tsx` | Server shell | Renders `<FamilyRegistrationForm mode="create" />` inside the existing saffron-gradient hero. Replaces current contact-fallback content entirely. |
| `app/signin/pending/page.tsx` | Server | Static "pending approval" screen (FR-04.3). |
| `app/signin/rejected/page.tsx` | Server | "Not approved — contact Organiser" screen (FR-04.4). |
| `app/signin/unregistered/page.tsx` | Server | "Not registered yet — register your family" screen with link to `/register`. |
| `app/admin/registrations/page.tsx` | Server wrapper + client list | Approval queue. See §9. |
| `app/member/family/edit/page.tsx` | Server wrapper + client form | Loads current family + renders `<FamilyRegistrationForm mode="edit" />`. Chosen over `/member/edit-family` because it reads as a sub-resource of `/member/family`. |

### 8.2 Components

| File | Kind | Notes |
|---|---|---|
| `components/FamilyRegistrationForm.tsx` | Client | Shared by `register` and `edit` flows via a `mode: "create" \| "edit"` prop and an optional `initialData` prop. One component for one UX (FR-10.1). |
| `components/FamilyMemberBlock.tsx` | Client | Collapsible per-member block with all FR-02 / FR-03 rules — same-as-primary toggles, age-18 marital lock, initiated reveal, DOB/anniversary fields. |
| `components/ConsentGate.tsx` | Client | Renders the FR-13 checkbox + disables submit until checked. |
| `components/FamilyQueueList.tsx` | Client | Queue list, expandable detail rows, Approve/Reject buttons. Fetches via `/api/family/pending` helper. |
| `components/FamilyDetailPanel.tsx` | Client | Read-only detail view used in the queue and in organiser-drilldown from future pages. Shows audit log timeline. |
| `components/AttendanceButton.tsx` | Client | Updated to accept a `scope: "family" \| "self"` prop. Primary of an Approved family renders the family variant; everyone else keeps the self variant. |
| `components/Navbar.tsx` | Client | Minor edit: admin link routes to `/admin/registrations` for Organisers with a pending count badge. |

**Client vs server boundary:** all pages are server components. The form, the queue list, and the attendance button are client components (`"use client"`) because they need state (`useState`, `sessionStorage`) and fetch mutations. Server components pass down the session, the initial family data (for edit), and the pending-queue snapshot as props — no client-side auth round-trips.

## 9. Client-side form UX

Layout is vertically stacked on mobile (360×640) and a single column on desktop up to 640px, matching the parent site's visual density.

```text
 ┌───────────────────────────────────────────────┐
 │ Register your family                          │
 │ ─ (om divider) ─                              │
 │ (one-paragraph warm intro)                    │
 │                                               │
 │ ▼ Your details (Primary) — auto-expanded      │
 │   [Name]  [Initiated ☐]  …                    │
 │   [Age]  [Gender ▾]  [Marital Status ▾]       │
 │   [Email]  [Phone]                            │
 │   [DOB — optional]  [Anniversary — opt.]      │
 │                                               │
 │ ▼ Family member 1 (▸ collapsed)               │
 │   [+ Add family member]                       │
 │                                               │
 │ ─────────────────────────────────────────     │
 │ ☐ I confirm I am authorised to share…         │
 │                                               │
 │ [   Submit registration   ]  (disabled until  │
 │                               consent ticked) │
 └───────────────────────────────────────────────┘
```

**Collapse/expand:** each secondary block is a `<details>` element in static HTML, progressively enhanced with a controlled `open` state after hydration so the chevron animates. Default-collapsed for blocks 2+; block 1 auto-expands on "Add family member" click. An accessible label on the summary reads `<relationship> · <given_name> · age <n>` so screen readers get a meaningful row title.

**Same-as-primary (FR-02.4):** two independent checkboxes per secondary — "Same email as Primary" and "Same phone as Primary". When checked, the field is disabled, visually greyed, and its value is set to `null` in form state (the display shows the primary's value). On submit the server copies the value as needed for FR-10.2 semantics; on render for edit the client re-derives the toggle state by comparing to the primary.

**Age-18 marital lock (FR-02.5, FR-12.3):** the marital-status `<select>` is `disabled` and forced to `Single` whenever the age field is < 18. A tooltip explains ("Marital status is set to Single for members under 18."). Changing the age from 17 to 18 enables the field; going the other way forces `Single` back and emits an `aria-live` message so screen readers pick it up (NFR-FR-4.3).

**Initiated reveal (FR-02.9):** checkbox toggles a conditionally rendered `<input name="initiated_name">`. `required` is set dynamically; `aria-expanded` is on the checkbox; the new input receives focus on first reveal.

**DOB/age mismatch warning (FR-03.6):** non-blocking. Computed client-side when DOB changes; renders an inline caution icon + message below the DOB field. Does not set `aria-invalid` (it's advisory) — uses `role="status"`.

**Consent gate (FR-13):** rendered as the final field, always visible, never hidden behind a details element. Submit is `disabled` until checked. Unchecking after checking re-disables Submit. On submit attempt with unchecked consent (only possible via direct API call), server returns 400 per FR-13.3.

**sessionStorage persistence (NFR-FR-3.4):** on every change, form state is serialised to `sessionStorage` under key `bhakti.family.register.draft`. On mount, if a draft exists and is < 30 minutes old (timestamped), it is loaded and the user is shown a small "Draft restored" toast with a "Clear" action. Cleared on successful submit.

## 10. Approval queue UX

One-screen list at `/admin/registrations`. Server-rendered shell loads the first page of Pending families; a small client component handles expansion and action clicks.

```text
 ┌─────────────────────────────────────────────────────────────────┐
 │ Family registrations                        Pending: 7          │
 │ ─ (om divider) ─                                                │
 │ [Pending ▾]  [Approved]  [Rejected]    (tabs)                   │
 │                                                                 │
 │ ▸ Ravi Sharma · ravi@gmail.com · +91 … · 4 members · 2 hrs ago  │
 │     (Spouse · Son (12) · Daughter (9))                          │
 │                                         [Approve]  [Reject ▾]   │
 │ ▸ Meera Iyer  · meera@gmail.com  · +91 … · 1 member  · 3 hrs ago│
 │                                         [Approve]  [Reject ▾]   │
 │ …                                                               │
 └─────────────────────────────────────────────────────────────────┘
```

**Expanded detail:** clicking a row expands in place (no route change) to show every field of every member, optional DOB/anniversary values, and the audit log timeline below. The detail panel is the same `<FamilyDetailPanel>` used elsewhere.

**Reject with reason:** "Reject ▾" reveals a small textarea inline and a confirm button. Reason is optional, 0–280 chars.

**Confirm affordance:** Approve uses a 2-state button — first click asks "Approve this family?" with Confirm/Cancel pills inline. Prevents thumbscrolling misfires on mobile. Reject has the textarea which itself acts as confirmation (two-step intent).

**Tabs for Approved / Rejected (FR-05.5):** implemented as server-side search params (`?tab=approved`) so each tab is bookmarkable and isn't a client-only filter. Pagination 50 per page.

**Loading states:** button shows a spinner until server responds. Row stays in place; on success, the row slides out with a subtle transition and the pending count decrements optimistically. On 409 "already approved by …", the row is replaced with a dismissable banner showing the other organiser's name (FR-06.5). On 500, an inline retry button appears.

**Optimistic updates:** the action is applied to local state before the server responds. On failure, state is rolled back and the row re-appears. This keeps the queue feeling fast on 3G.

## 11. Audit log

### 11.1 Write path

Every state-changing RPC (`approve_family`, `reject_family`, `reopen_family`, `edit_family`, `register_family`, `delete_family`) writes to `family_audit_log` in the same transaction. A trigger failure rolls back the state change (FR-11.4). Diffs are computed in SQL for approve/reject/reopen (trivial), and in the Node layer for edit (needs the full `before` snapshot — loaded within the transaction, diffed, persisted as the `diff` JSONB).

### 11.2 Read path

Organiser detail panel (§10) queries `family_audit_log WHERE family_id = ? ORDER BY occurred_at DESC LIMIT 50`. Rendered as a vertical timeline with actor email, role badge, action label, human-readable diff summary, and timestamp.

Diffs are summarised for display by a small formatter:

- `{"status":{"from":"Pending","to":"Approved"}}` → "Approved this family"
- `{"added":[…], "removed":[…], "changed":[…]}` → "Added 1 member (Asha, Daughter, 9); Changed 2 fields on Ravi (age 37 → 38; marital Married)"

## 12. Attendance shape — resolves OQ-FR-3 and OQ-FR-6

Schema chosen in §5.4 above: new `family_attendance` table, existing `attendance` table untouched.

### 12.1 De-dup rule when both signals fire

Both tables are insert-only per session × subject. The de-dup for *counting* (not for preventing inserts) is resolved at read time via a view:

```sql
CREATE VIEW effective_attendance AS
-- Family attendance: one row per (family, week). Each emits one row per
-- approved family member so totals are meaningful.
SELECT
  fm.id                AS attendee_id,
  'family_auto'::text  AS source,
  fa.session_week      AS session_week,
  fa.marked_at         AS marked_at
FROM family_attendance fa
JOIN family_members fm ON fm.family_id = fa.family_id
JOIN families f        ON f.id = fa.family_id AND f.status = 'Approved'
UNION
-- Individual attendance: one row per (member, week). Deduplicated against
-- family-auto via the UNION (not UNION ALL) on (attendee_id, session_week).
SELECT
  m.id,
  'self'::text,
  a.session_week,
  a.marked_at
FROM attendance a
JOIN members m ON m.id = a.member_id;
```

There is no single `attendee_id` column that spans both tables today (individual attendance uses `members.id`; family attendance expands to `family_members.id`). The view papers over this by reporting `family_members.id` on the family side and `members.id` on the self side — since those are different UUID spaces, UNION gives us one row per real-person per session for counting.

**De-dup semantics:** if a primary marks family-attendance AND a secondary separately marks self-attendance with their own Gmail, the secondary row appears once in `attendance` and once (as the family member) in `family_attendance`. The view emits both but the reporting query counts unique (session_week, person) at the view layer — which is fine because neither side of the UNION can be an exact duplicate of the other (different UUID spaces).

Acceptable for Phase 1. If/when per-member attendance within a family arrives (Phase 2), `family_attendance` stays and a `family_member_attendance` table takes over granular marks; the view evolves.

### 12.2 What happens on un-approval (OQ-FR-6)

**Decision: preserve-and-orphan.** When an Approved family is rejected, `family_attendance` rows are *not* deleted. The family's status changes, the allowlist view immediately stops matching, but the historical attendance rows remain — organisers need that data for retrospectives and the cost of preserving it is zero. A Phase 2 UI may surface "attended while approved" alongside the rejection note.

If a family is hard-deleted (NFR-FR-2.3), `ON DELETE CASCADE` on `family_attendance.family_id` drops the rows — which is fine because hard-delete also produces a single audit tombstone.

## 13. Rate limiting / spam — resolves OQ-FR-7

**Decision: no IP rate limit in Phase 1.** Rely on Organiser review.

Justification:
- Our expected volume is < 100 registrations total over the lifetime of the program — spam rate is tiny in absolute terms.
- Organisers review every submission before it becomes actionable (the allowlist view requires Approved status).
- Adding a Vercel Edge rate limit introduces a new dependency and a new failure mode (rate-limit false positives blocking a legitimate family from registering over a shared network — e.g. an apartment building Wi-Fi).

If the queue ever accumulates obvious spam (Assumption 4), we add a simple per-IP limit at the Edge (5 submissions per IP per hour) as a Phase 2 follow-up. A CAPTCHA is not proposed for Phase 1 because the friction cost on a 3G mobile connection is meaningful and the threat model doesn't warrant it.

## 14. Organiser concurrency — resolves OQ-FR-8

**Decision: optimistic last-writer-wins with explicit conflict error, no claim signal.**

Implementation:
- `families.version INT NOT NULL DEFAULT 1`, bumped on every state-changing RPC.
- The queue client reads `version` with each row.
- The Approve/Reject request sends the observed version; RPC compares and aborts with `P0002` ("stale version") if they don't match.
- Server returns 409 with the current actor and timestamp: `"Already approved by Mahaprema Prabhu at 14:32 IST"`.
- Client rolls back the optimistic update and displays an inline banner.

Why not a claim signal:
- Our pending queue is small (< 20 at a peak) and two organisers simultaneously reviewing the same row is rare.
- Claim introduces stuck-claim failure modes (organiser opens the detail panel on their phone, phone dies — claim dangles) that need timeouts and cleanup.
- Optimistic + clear conflict message is the simpler correct behaviour.

## 15. Testing plan

### 15.1 Manual test matrix (dev first)

| # | Scenario | Expected |
|---|---|---|
| 1 | Submit a valid 4-person family via `/register` | 201; row appears in `/admin/registrations` within 1 min (G2, FR-05.1). |
| 2 | Submit with consent unchecked (via cURL) | 400 "Consent to share family data is required". |
| 3 | Submit with a duplicate primary email | 409 with contact-page pointer. |
| 4 | Add a 16th secondary | Add-button disabled; message shown; server would reject too. |
| 5 | Age 16 + marital = Married | Client locks field to Single; server CHECK rejects if bypassed. |
| 6 | Initiated ticked without initiated_name | Submit blocked client-side; server CHECK rejects if bypassed. |
| 7 | Manager approves a Pending family | Status flips to Approved; primary signs in within 60s with role=member (G3, FR-07.2). |
| 8 | Primary signs in while Pending | Redirected to `/signin/pending`; no `members` row created. |
| 9 | Primary signs in while Rejected | Redirected to `/signin/rejected`. |
| 10 | Two organisers approve the same family at once | One succeeds, the other gets 409 with actor name (FR-06.5). |
| 11 | Approve → approved family signs in; marks attendance via family scope on Sunday | Exactly one `family_attendance` row; no row in `attendance`. |
| 12 | Secondary with own Gmail marks self-attendance same day | Row in `attendance`; family_attendance unchanged; de-dup view returns one row per person. |
| 13 | Primary edits family (adds a secondary with Gmail) | Secondary's email in allowlist within same transaction; they sign in on next attempt. |
| 14 | Primary edits phone only | No consent re-prompt; audit log row written. |
| 15 | Primary edits a member's age from 17 to 18 | Consent re-required; audit log row captures before/after. |
| 16 | Organiser reopens a Rejected family then Approves | Two audit rows (Reopen, Approve); allowlist includes primary after Approve. |
| 17 | Attempt to transition Approved → Pending | RPC rejects with clear error; no audit row written. |
| 18 | Hard-delete a family via admin tool | CASCADE removes members/events/attendance; one Delete audit row remains. |
| 19 | `/admin/registrations` hit by a Member | Middleware redirects to `/signin`. |
| 20 | Render queue with 50 pending families on 3G | Interactive in < 2s (NFR-FR-5.2). |

Manual tests run on `https://*-dev.vercel.app` against the dev Supabase project (zvwisehlrojssbeqzhrz) before any prod migration. Prod gets the same migrations after dev sign-off.

### 15.2 Automated tests (follow-up, not blocking)

The parent spec ships without tests. We maintain parity in Phase 1. A follow-up task list will add: Zod schema unit tests for the register body, a state-machine unit test for `assert_family_transition`, and a Playwright smoke over the happy path. Kept out of today's critical path.

## 16. Deployment plan

### 16.1 Migration order

```text
supabase/migrations/
  007_families.sql                # families table + enums + consent CHECK
  008_family_members.sql          # family_members + enums + triggers
  009_family_events.sql           # family_events + indexes
  010_family_attendance.sql       # new table
  011_family_audit_log.sql        # audit log + append-only triggers
  012_families_rls.sql            # RLS + approved_family_emails view
  013_families_rpcs.sql           # approve_family / reject_family /
                                  # reopen_family / edit_family RPCs
  014_effective_attendance.sql    # read-side UNION view
```

Each migration is idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`) to match the parent convention. Applied via `supabase/apply-migrations.mjs`.

### 16.2 Seed strategy

No seed. Phase 1 starts with an empty `families` table — existing code-allowlist users (Manager + Organisers in `lib/auth/roles.ts`) continue to sign in unchanged. The WhatsApp-fallback registration flow is retired on the same deploy that ships the new `/register`.

### 16.3 Env vars

None new. The existing `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` cover every new call.

### 16.4 Order of operations

1. Apply migrations 007–014 on **dev** Supabase.
2. Deploy to dev Vercel.
3. Run the §15.1 manual matrix end to end on dev.
4. Apply migrations 007–014 on **prod** Supabase.
5. Deploy to prod Vercel.
6. Smoke-test scenarios 1, 7, 11 on prod with a throwaway Gmail.
7. Update `lib/auth/roles.ts` is **not** touched — the code-allowlist entries remain hard-coded and continue to override DB allowlisting.

Migration rollback: since migrations are additive and never destructive to existing tables, rollback is "stop deploying" + a one-off `DROP TABLE family_audit_log, family_attendance, family_events, family_members, families CASCADE` if absolutely needed. Not expected.

## 17. Non-goals for today's build

- No celebration cards or upcoming-birthday UI (Phase 2 of this spec).
- No automated approve/reject emails (Phase 2).
- No photo upload per family.
- No per-secondary differentiated dashboard view.
- No bulk approve / bulk reject.
- No organiser-initiated family creation.
- No Hindi copy on the form.
- No CAPTCHA, no IP rate limiting.
- No automated tests; manual test matrix only.

## 18. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A primary's JWT stays valid after an Organiser rejects them, keeping them signed in for up to 30 days | Accepted for Phase 1; Phase 2 adds a `session_version` check in the jwt callback to invalidate stale JWTs (see §6.3). |
| Approved-family-emails view becomes slow at scale | Unlikely below ~10k approved families; swap to materialised view if needed. |
| Two organisers racing on the same family | Optimistic `families.version` + 409 with a human-readable "already approved by …" message (§14). |
| A primary's Gmail collides with a hard-coded organiser email | FR-07.4 makes the code-based role win; the `approve_family` RPC additionally refuses to promote an email already in ROLE_ALLOWLIST to prevent confusion. |
| Consent CHECK constraint prevents atomic family creation if consent logic breaks | We write consent + family in the same INSERT (single row); no inter-row ordering risk. |
| Append-only audit log triggers block a valid `ON CONFLICT DO UPDATE` | Not an issue — we never UPDATE or upsert audit rows, only INSERT. |
| Phase-2 celebrations UI needs more than current `family_events` shape | Additive. New event kinds are ALTER TYPE. New column on `family_events` if needed. |

## 19. Decisions log

| # | Decision | Justification |
|---|---|---|
| D1 | New `family_attendance` table, existing `attendance` table untouched | Clean separation for Phase 2 additive features (per-member-within-family marks, organiser mark-on-behalf, absence reporting) without schema rewrite. |
| D2 | Consent lives on `families` (flag + timestamp), not in a separate table | Single event in Phase 1; CHECK constraint enforces "no family without consent" atomically. Separate table only when we need history. |
| D3 | DB-backed allowlist is a Postgres view, not a materialised table | Transactional correctness without a refresh step; plenty fast at our scale. |
| D4 | State machine allows Approved → Rejected; forbids Approved → Pending | Clean-up of spam-approvals needed; reverting to a review queue is not a real workflow. |
| D5 | DB lookup for role resolution happens in the `signIn` callback, not `jwt` | One lookup per sign-in vs per request. Tradeoff: rejection of an active session takes up to a JWT-lifetime to apply. |
| D6 | Extend existing `/api/attendance/mark` with a `scope` field instead of a new `/api/attendance/mark-family` endpoint | Single handler, one set of session/IST/session-lookup guards, simpler client code. |
| D7 | Optimistic `families.version` + 409 conflict, no claim signal | Simpler; no stuck-claim failure mode. Our concurrency is low. |
| D8 | No IP rate limit in Phase 1 | Low expected volume; organiser review catches spam; avoids shared-Wi-Fi false positives. |
| D9 | `lib/auth/roles.ts` `roleFor()` becomes async | DB allowlist consultation needs a round-trip; three call-sites updated. |
| D10 | Append-only audit log enforced by triggers, not application discipline | Database-level guarantee survives buggy application code. |
| D11 | `family_members.relationship` as an enum, not TEXT+CHECK | Typo-proof; cheap to extend via ALTER TYPE; queried frequently by queue detail view. |
| D12 | `family_events` as row-per-event, not columns on `family_members` | Phase 2 celebration query is month+day across all events in one scan. |
| D13 | Preserve-and-orphan on un-approval (OQ-FR-6); cascade on hard-delete | Retrospective attendance data has value; hard-delete produces a tombstone. |
| D14 | Edit-family path is `app/member/family/edit/page.tsx` | Reads as a sub-resource of `/member/family`; leaves room for a read-only `/member/family` index later. |
| D15 | Shared `<FamilyRegistrationForm>` for create + edit via a `mode` prop | Single source of truth for every FR-02 / FR-03 / FR-13 rule; avoids divergence. |
| D16 | Enums + CHECK constraints at the DB layer for FR-12 invariants, not only in app code | App-level checks can be bypassed by a direct service-role INSERT; invariants belong at the persistence layer. |
| D17 | Material-change predicate is a pure function in `lib/family/material-change.ts`, shared by client + server | Client disables/enables the consent prompt live; server is authoritative. One source of truth. |
| D18 | No seed; no backfill for existing allowlist emails | Existing code-allowlist stays in `roles.ts`; DB allowlist starts empty; no dual-sourcing of truth during rollout. |

---

**End of design draft v1.** Review focus: §4 state machine (D4), §5.4 + §12 attendance shape (D1), §6 auth model changes (D5, D9), §14 concurrency (D7). On your approval, tasks.md is generated next.
