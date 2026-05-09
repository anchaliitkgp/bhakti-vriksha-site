-- Migration 002: members
-- One row per signed-in user. Upserted on every Google sign-in.

CREATE TABLE IF NOT EXISTS members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  name         TEXT,
  google_sub   TEXT UNIQUE,
  role         TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('member', 'organiser', 'manager')),
  first_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members (lower(email));
CREATE INDEX IF NOT EXISTS idx_members_role ON members (role);

COMMENT ON TABLE members IS 'Signed-in users. Role is assigned from the allowlist in lib/auth/roles.ts.';
