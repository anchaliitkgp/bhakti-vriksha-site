-- Migration 003: attendance
-- One row per (member, session). Marked by member on the session day (IST).
-- Organisers may later mark on behalf of a member within a 7-day window.

CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_week  INT  NOT NULL REFERENCES sessions(week) ON DELETE CASCADE,
  marked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_by     UUID REFERENCES members(id) ON DELETE SET NULL,
  UNIQUE (member_id, session_week)
);

CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance (member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance (session_week);

COMMENT ON TABLE attendance IS
  'Member self-attendance. Insert allowed only when session.date = today (IST) — enforced in server code.';
