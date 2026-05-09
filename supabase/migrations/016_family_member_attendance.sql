-- Migration 016: family_member_attendance
-- Per-family-member attendance. Keyed by family_members.id so we can track
-- attendance even for members who never sign in (e.g. minors without Gmail)
-- and for members whose email uses "Same as Primary".
--
-- Design §5.4 D1 already anticipated this as the Phase 2 additive extension
-- of family_attendance. The old `family_attendance` table stays in place for
-- backward compatibility + the "family was here at all" semantic; new code
-- prefers this table for granular per-member reporting.

CREATE TABLE IF NOT EXISTS family_member_attendance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  session_week     INT  NOT NULL REFERENCES sessions(week) ON DELETE CASCADE,
  marked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_by        UUID REFERENCES members(id) ON DELETE SET NULL,

  UNIQUE (family_member_id, session_week)
);

CREATE INDEX IF NOT EXISTS idx_fma_member
  ON family_member_attendance (family_member_id);
CREATE INDEX IF NOT EXISTS idx_fma_session
  ON family_member_attendance (session_week);

COMMENT ON TABLE family_member_attendance IS
  'Per-family-member attendance. Primary marks each member individually; Secondary with own Gmail marks only their own row. Unique per (family_member, session).';

-- Refresh the effective_attendance view to include the new granular source.
-- Priority order for a given (person, week):
--   1. family_member_attendance (most precise)
--   2. attendance (self-marked via members.id)
--   3. family_attendance (coarse "the family was there")
-- UNION (not UNION ALL) de-dups when multiple sources fired.
CREATE OR REPLACE VIEW effective_attendance AS
-- granular per-member
SELECT
  fm.id                AS attendee_id,
  'family_member'::text AS source,
  fma.session_week     AS session_week,
  fma.marked_at        AS marked_at
FROM family_member_attendance fma
JOIN family_members fm ON fm.id = fma.family_member_id
JOIN families f        ON f.id = fm.family_id AND f.status = 'Approved'
UNION
-- coarse family-wide, expanded to each member
SELECT
  fm.id                AS attendee_id,
  'family_auto'::text  AS source,
  fa.session_week      AS session_week,
  fa.marked_at         AS marked_at
FROM family_attendance fa
JOIN family_members fm ON fm.family_id = fa.family_id
JOIN families f        ON f.id = fa.family_id AND f.status = 'Approved'
UNION
-- self on the legacy attendance table (for signed-in users not in a family)
SELECT
  m.id                 AS attendee_id,
  'self'::text         AS source,
  a.session_week       AS session_week,
  a.marked_at          AS marked_at
FROM attendance a
JOIN members m ON m.id = a.member_id;

COMMENT ON VIEW effective_attendance IS
  'Unified read-side view across family_member_attendance + family_attendance + attendance. Used by Phase-2 reporting.';
