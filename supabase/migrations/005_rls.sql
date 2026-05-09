-- Migration 005: Row-Level Security
-- Defense in depth: the Next.js server uses the service_role key which
-- bypasses RLS. If a future direct-from-browser client is added, these
-- policies kick in. For today, enabling RLS with sensible read policies
-- is enough — writes happen only through trusted server code.
--
-- Postgres 15 (Supabase default) doesn't support CREATE POLICY IF NOT EXISTS,
-- so we DROP POLICY IF EXISTS first to make this migration re-runnable.

ALTER TABLE sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Sessions: anyone authenticated can read; only service role writes.
DROP POLICY IF EXISTS "sessions_authenticated_read" ON sessions;
CREATE POLICY "sessions_authenticated_read" ON sessions
  FOR SELECT TO authenticated USING (true);

-- Members: a member can read their own row; service role handles writes.
DROP POLICY IF EXISTS "members_read_own" ON members;
CREATE POLICY "members_read_own" ON members
  FOR SELECT TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Attendance: a member can read their own rows.
DROP POLICY IF EXISTS "attendance_read_own" ON attendance;
CREATE POLICY "attendance_read_own" ON attendance
  FOR SELECT TO authenticated
  USING (
    member_id = (
      SELECT id FROM members
      WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Announcements: anyone authenticated can read active banners.
DROP POLICY IF EXISTS "announcements_read_active" ON announcements;
CREATE POLICY "announcements_read_active" ON announcements
  FOR SELECT TO authenticated
  USING (CURRENT_DATE BETWEEN starts_on AND ends_on);
