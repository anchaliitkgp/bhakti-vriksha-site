-- Migration 010: family_attendance
-- One row per (family, session_week). Independent of the existing `attendance`
-- table, which continues to track individual (members.id) marks.
-- De-dup across both tables is resolved at read time by the
-- effective_attendance view in migration 014.
--
-- IMPORTANT: do NOT modify attendance (migration 003). Keep the existing
-- parent-spec RLS policies and dashboard reads untouched.

CREATE TABLE IF NOT EXISTS family_attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  session_week  INT  NOT NULL REFERENCES sessions(week) ON DELETE CASCADE,
  marked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_by     UUID REFERENCES members(id) ON DELETE SET NULL,
  head_count    INT, -- nullable; future per-session headcount capture

  UNIQUE (family_id, session_week)
);

CREATE INDEX IF NOT EXISTS idx_family_attendance_family
  ON family_attendance (family_id);
CREATE INDEX IF NOT EXISTS idx_family_attendance_session
  ON family_attendance (session_week);

COMMENT ON TABLE family_attendance IS
  'Family-level attendance. One row per (family, session) - marked by the Primary on the session day (IST). Enforced in server code. The existing attendance table remains the source for individual marks.';
