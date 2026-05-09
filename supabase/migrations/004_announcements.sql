-- Migration 004: announcements
-- Short text posted by Organisers; appears as a home-page banner between starts_on and ends_on.
-- Table is created now; editor UI comes next weekend.

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 280),
  starts_on   DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_on     DATE NOT NULL,
  created_by  UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON announcements (starts_on, ends_on);

COMMENT ON TABLE announcements IS
  'Home-page announcement banners. Visible when CURRENT_DATE BETWEEN starts_on AND ends_on.';
