-- Migration 001: sessions
-- The 32-week curriculum. Seeded from data/schedule.ts on first run.
-- Public pages continue to read from the TS file for Phase 1 performance.
-- Organisers will edit this table via the admin UI in Phase 2.

CREATE TABLE IF NOT EXISTS sessions (
  week              INT PRIMARY KEY,
  date              DATE NOT NULL UNIQUE,
  category          TEXT NOT NULL
                      CHECK (category IN ('Gita / Core', 'Practical (HG Radheshyam Prabhu)')),
  title             TEXT NOT NULL,
  suggested_level   TEXT,
  suggested_speaker TEXT,
  notes             TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by        UUID
);

COMMENT ON TABLE sessions IS '32-week curriculum. Edited by Organisers in Phase 2.';
