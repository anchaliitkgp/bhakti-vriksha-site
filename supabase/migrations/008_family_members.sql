-- Migration 008: family_members
-- One row per person in a family. Exactly one Primary per family; up to 15
-- Secondaries. Minors (< 18) are locked to marital_status = 'Single' at the
-- persistence layer as defence-in-depth on top of the client UI.
--
-- Uses TEXT + CHECK rather than Postgres ENUMs to keep forward-compatibility
-- cheap. Adding a new relationship value is then a no-op DDL change.

CREATE TABLE IF NOT EXISTS family_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  kind                TEXT NOT NULL
                          CHECK (kind IN ('Primary', 'Secondary')),
  given_name          TEXT NOT NULL
                          CHECK (length(btrim(given_name)) BETWEEN 1 AND 120),
  initiated           BOOLEAN NOT NULL DEFAULT false,
  initiated_name      TEXT,
  relationship        TEXT NOT NULL
                          CHECK (relationship IN (
                            'Self', 'Spouse', 'Son', 'Daughter',
                            'Mother', 'Father', 'Sister', 'Brother', 'Other'
                          )),
  relationship_other  TEXT,
  age                 INT NOT NULL CHECK (age BETWEEN 0 AND 120),
  gender              TEXT NOT NULL
                          CHECK (gender IN ('Male', 'Female', 'Other')),
  marital_status      TEXT NOT NULL
                          CHECK (marital_status IN ('Married', 'Single')),
  email               TEXT,
  phone               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- FR-02.9: initiated name is required (and non-empty) when initiated = true
  CONSTRAINT fm_initiated_name_when_initiated CHECK (
    initiated = false
    OR (initiated_name IS NOT NULL AND length(btrim(initiated_name)) > 0)
  ),

  -- FR-02.3: 'Other' relationship requires a label, 1..40 chars
  CONSTRAINT fm_relationship_other_label CHECK (
    (relationship <> 'Other' AND relationship_other IS NULL)
    OR (
      relationship = 'Other'
      AND relationship_other IS NOT NULL
      AND length(btrim(relationship_other)) BETWEEN 1 AND 40
    )
  ),

  -- FR-12.1, FR-12.6: Primary row must have relationship = 'Self'
  CONSTRAINT fm_primary_self CHECK (
    kind = 'Secondary'
    OR (kind = 'Primary' AND relationship = 'Self')
  ),

  -- FR-12.3: age < 18 forces marital_status = 'Single' at the persistence
  -- layer, even if the client is bypassed.
  CONSTRAINT fm_minor_is_single CHECK (
    age >= 18 OR marital_status = 'Single'
  )
);

-- FR-12.1: exactly one Primary per family. Partial unique index is the
-- idiomatic Postgres way to express this.
CREATE UNIQUE INDEX IF NOT EXISTS uq_family_one_primary
  ON family_members (family_id)
  WHERE kind = 'Primary';

CREATE INDEX IF NOT EXISTS idx_family_members_family_id
  ON family_members (family_id);

-- Used by approved_family_emails view + signIn-callback lookup
CREATE INDEX IF NOT EXISTS idx_family_members_email_lower
  ON family_members (lower(email))
  WHERE email IS NOT NULL;

-- FR-12.5, FR-02.7: at most 16 members per family (1 Primary + 15 Secondary).
-- Enforced as a deferred constraint trigger so multi-row inserts that
-- ultimately stay within the cap do not trip while the batch is in flight.
CREATE OR REPLACE FUNCTION enforce_family_size() RETURNS trigger AS $$
BEGIN
  IF (SELECT count(*) FROM family_members WHERE family_id = NEW.family_id) > 16 THEN
    RAISE EXCEPTION 'Family % exceeds the 16-member limit', NEW.family_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_family_size ON family_members;
CREATE CONSTRAINT TRIGGER trg_enforce_family_size
  AFTER INSERT ON family_members
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_family_size();

COMMENT ON TABLE family_members IS
  'Members of a registered family. Exactly one Primary per family; at most 15 Secondaries. Minors locked to marital_status = Single.';
