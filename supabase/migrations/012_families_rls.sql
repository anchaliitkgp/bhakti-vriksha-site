-- Migration 012: RLS + approved_family_emails view
-- Defence in depth: the Next.js server writes via the service_role key
-- (which bypasses RLS), so these policies govern read access from any
-- future direct-from-browser use. They mirror the style of 005_rls.sql.

ALTER TABLE families          ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_audit_log  ENABLE ROW LEVEL SECURITY;

-- ─── families ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "families_org_read" ON families;
CREATE POLICY "families_org_read" ON families
  FOR SELECT TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'role', 'guest') IN ('organiser', 'manager')
  );

DROP POLICY IF EXISTS "families_primary_read_own" ON families;
CREATE POLICY "families_primary_read_own" ON families
  FOR SELECT TO authenticated
  USING (
    lower(primary_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- ─── family_members ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "family_members_read" ON family_members;
CREATE POLICY "family_members_read" ON family_members
  FOR SELECT TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'role', 'guest') IN ('organiser', 'manager')
    OR EXISTS (
      SELECT 1 FROM families f
       WHERE f.id = family_id
         AND lower(f.primary_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- ─── family_events ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "family_events_read" ON family_events;
CREATE POLICY "family_events_read" ON family_events
  FOR SELECT TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'role', 'guest') IN ('organiser', 'manager')
    OR EXISTS (
      SELECT 1
        FROM family_members fm
        JOIN families f ON f.id = fm.family_id
       WHERE fm.id = family_member_id
         AND lower(f.primary_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- ─── family_attendance ───────────────────────────────────────────────
DROP POLICY IF EXISTS "family_attendance_read" ON family_attendance;
CREATE POLICY "family_attendance_read" ON family_attendance
  FOR SELECT TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'role', 'guest') IN ('organiser', 'manager')
    OR EXISTS (
      SELECT 1 FROM families f
       WHERE f.id = family_id
         AND lower(f.primary_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- ─── family_audit_log ────────────────────────────────────────────────
-- Organisers + Managers only. Primaries do not see their own audit trail
-- in Phase 1.
DROP POLICY IF EXISTS "family_audit_org_read" ON family_audit_log;
CREATE POLICY "family_audit_org_read" ON family_audit_log
  FOR SELECT TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'role', 'guest') IN ('organiser', 'manager')
  );

-- No INSERT / UPDATE policies are defined on any of these tables. All
-- writes go through the service-role key from server code (mirrors 005_rls).

-- ─── approved_family_emails view ─────────────────────────────────────
-- Used by roleFor() / isApprovedFamilyEmail() and by signIn-callback
-- gating. A plain view (not materialised) gives us read-your-writes in the
-- same transaction as approve_family / reject_family / reopen_family.
CREATE OR REPLACE VIEW approved_family_emails AS
SELECT
  lower(f.primary_email) AS email,
  f.id                   AS family_id,
  'primary'::text        AS source
FROM families f
WHERE f.status = 'Approved'
UNION ALL
SELECT
  lower(fm.email)  AS email,
  fm.family_id     AS family_id,
  'secondary'::text AS source
FROM family_members fm
JOIN families f ON f.id = fm.family_id
WHERE f.status = 'Approved'
  AND fm.kind = 'Secondary'
  AND fm.email IS NOT NULL
  AND lower(fm.email) LIKE '%@gmail.com';

COMMENT ON VIEW approved_family_emails IS
  'DB-backed allowlist of emails authorised to sign in as members. Queried from lib/auth/db-allowlist.ts. Transactional: updates to families.status are reflected immediately.';
