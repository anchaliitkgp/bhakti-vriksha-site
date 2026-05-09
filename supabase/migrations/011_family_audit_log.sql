-- Migration 011: family_audit_log
-- Append-only history of every state-changing action on a family.
-- family_id is intentionally NOT a foreign key so a 'Delete' tombstone row
-- survives after its family is hard-deleted (NFR-FR-2.3).

CREATE TABLE IF NOT EXISTS family_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL,
  actor_id    UUID REFERENCES members(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_role  TEXT NOT NULL
                  CHECK (actor_role IN ('member','organiser','manager','system')),
  action      TEXT NOT NULL
                  CHECK (action IN ('Create','Approve','Reject','Reopen','Edit','Delete')),
  diff        JSONB NOT NULL DEFAULT '{}'::jsonb,
  note        TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary read path: organiser detail panel renders the last N audit rows
-- for a family in reverse-chronological order.
CREATE INDEX IF NOT EXISTS idx_family_audit_family_id
  ON family_audit_log (family_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_family_audit_actor_id
  ON family_audit_log (actor_id);

-- Append-only: UPDATE and DELETE are forbidden at the DB layer, not just by
-- application discipline, so a buggy or malicious code path cannot rewrite
-- history.
CREATE OR REPLACE FUNCTION fal_no_mutate() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'family_audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fal_no_update ON family_audit_log;
CREATE TRIGGER trg_fal_no_update
  BEFORE UPDATE ON family_audit_log
  FOR EACH ROW EXECUTE FUNCTION fal_no_mutate();

DROP TRIGGER IF EXISTS trg_fal_no_delete ON family_audit_log;
CREATE TRIGGER trg_fal_no_delete
  BEFORE DELETE ON family_audit_log
  FOR EACH ROW EXECUTE FUNCTION fal_no_mutate();

COMMENT ON TABLE family_audit_log IS
  'Append-only audit history. Append via INSERT only; UPDATE and DELETE are blocked by triggers.';
