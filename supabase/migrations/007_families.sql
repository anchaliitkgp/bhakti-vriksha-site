-- Migration 007: families
-- One row per family that registers via /register. Status machine:
--   Pending --approve-->  Approved
--   Pending --reject-->   Rejected
--   Rejected --reopen-->  Pending
--   Approved --reject-->  Rejected
--   Approved --> Pending  FORBIDDEN
-- Enforcement lives in the RPCs (migration 013), not here — the table just
-- stores state + optimistic-concurrency version + consent timestamp.
--
-- Phase 1 captures consent as a single boolean+timestamp on the family row.
-- A CHECK constraint prevents a row from being persisted without consent
-- (requirements FR-13.3, FR-13.6). Phase 2 may introduce a consent-history
-- table if GDPR-style withdraw/renew is needed.

CREATE TABLE IF NOT EXISTS families (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status            TEXT NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  primary_email     TEXT NOT NULL,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES members(id) ON DELETE SET NULL,
  rejected_at       TIMESTAMPTZ,
  rejected_by       UUID REFERENCES members(id) ON DELETE SET NULL,
  rejection_reason  TEXT CHECK (
                        rejection_reason IS NULL
                        OR length(rejection_reason) <= 280
                      ),
  consent_given     BOOLEAN NOT NULL DEFAULT false,
  consent_at        TIMESTAMPTZ,
  version           INT NOT NULL DEFAULT 1,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- FR-12.4: primary email unique across ALL statuses
  CONSTRAINT families_primary_email_unique UNIQUE (primary_email),

  -- FR-12.7: actor + timestamp are set together on approve/reject
  CONSTRAINT families_approved_pair
    CHECK ((approved_at IS NULL) = (approved_by IS NULL)),
  CONSTRAINT families_rejected_pair
    CHECK ((rejected_at IS NULL) = (rejected_by IS NULL)),

  -- FR-13.6: no persisted row without consent
  CONSTRAINT families_consent_required
    CHECK (consent_given = true AND consent_at IS NOT NULL)
);

-- Queue hot-path: most admin reads filter to status = 'Pending'.
-- Partial index is cheap and keeps the queue view scan-free.
CREATE INDEX IF NOT EXISTS idx_families_status_pending
  ON families (submitted_at)
  WHERE status = 'Pending';

-- Case-insensitive lookup by primary_email (signIn callback, register conflict check)
CREATE INDEX IF NOT EXISTS idx_families_primary_email_lower
  ON families (lower(primary_email));

-- General submitted_at index for Approved / Rejected tab pagination
CREATE INDEX IF NOT EXISTS idx_families_submitted_at
  ON families (submitted_at);

COMMENT ON TABLE families IS
  'Family registrations. Status machine enforced by RPCs in migration 013. All writes go through the service-role key from server code.';
COMMENT ON COLUMN families.version IS
  'Optimistic concurrency token. Bumped on every state-changing RPC. RPCs compare expected_version and raise P0002 on mismatch -> 409.';
COMMENT ON COLUMN families.consent_given IS
  'FR-13: data-sharing consent. CHECK constraint forbids false or NULL rows.';
