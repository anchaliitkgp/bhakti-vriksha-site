-- Migration 014: effective_attendance view
-- Read-side view that UNIONs:
--   1. family_attendance expanded to one row per approved family member
--      (so "the family attended" counts as attendance for everyone in it)
--   2. the existing `attendance` table (individual self-marks)
--
-- Different UUID spaces — attendee_id on the self side is members.id; on
-- the family-auto side it is family_members.id. UNION (not UNION ALL)
-- handles any overlap cheaply; at read time a query counting unique
-- (session_week, person) will get one row per real person.

CREATE OR REPLACE VIEW effective_attendance AS
SELECT
  fm.id                 AS attendee_id,
  'family_auto'::text   AS source,
  fa.session_week       AS session_week,
  fa.marked_at          AS marked_at
FROM family_attendance fa
JOIN family_members fm ON fm.family_id = fa.family_id
JOIN families f        ON f.id = fa.family_id AND f.status = 'Approved'
UNION
SELECT
  m.id                  AS attendee_id,
  'self'::text          AS source,
  a.session_week        AS session_week,
  a.marked_at           AS marked_at
FROM attendance a
JOIN members m ON m.id = a.member_id;

COMMENT ON VIEW effective_attendance IS
  'Unified read-side view across family_attendance + attendance. Used by Phase-2 reporting. Not used by the Phase-1 member dashboard (which still reads from attendance only).';
