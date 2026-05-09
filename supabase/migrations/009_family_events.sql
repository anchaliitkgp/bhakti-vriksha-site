-- Migration 009: family_events
-- Optional life events per family member — Date of Birth and Wedding
-- Anniversary. Kept as a separate row-per-event table so:
--   1. Phase 2 celebration queries can scan by (MONTH, DAY) in a single pass
--   2. New event kinds (vrata-vow dates, etc.) are an additive enum change,
--      not a schema migration.

CREATE TABLE IF NOT EXISTS family_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id  UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL
                        CHECK (kind IN ('DateOfBirth', 'WeddingAnniversary')),
  event_date        DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fe_event_date_sane CHECK (
    event_date BETWEEN DATE '1900-01-01' AND CURRENT_DATE + INTERVAL '1 day'
  ),

  -- Each member has at most one DOB and one anniversary.
  CONSTRAINT fe_one_per_kind UNIQUE (family_member_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_family_events_member_id
  ON family_events (family_member_id);

-- Phase-2 celebration card ("Who has a birthday next week?") queries by
-- month + day. Expression index lets that become a range scan.
CREATE INDEX IF NOT EXISTS idx_family_events_month_day
  ON family_events (EXTRACT(MONTH FROM event_date), EXTRACT(DAY FROM event_date));

COMMENT ON TABLE family_events IS
  'Optional life events per family member. Used by Phase-2 celebration UI.';
