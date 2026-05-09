-- Migration 013: state-transition RPCs for the family state machine.
--
-- Allowed transitions (see design §4):
--   Pending  --approve-->  Approved
--   Pending  --reject--->  Rejected
--   Rejected --reopen--->  Pending
--   Approved --reject--->  Rejected
--   Approved --> Pending  FORBIDDEN
--
-- Every mutating RPC:
--   1. Validates the current status
--   2. Checks the caller's expected_version against families.version
--      (raises SQLSTATE P0002 on mismatch → mapped to HTTP 409 by the API)
--   3. Bumps version + updated_at
--   4. Writes exactly one row to family_audit_log
-- All in one transaction.

-- ─── Helper: transition validator ────────────────────────────────────
CREATE OR REPLACE FUNCTION assert_family_transition(
  p_old TEXT,
  p_new TEXT
) RETURNS void AS $$
BEGIN
  -- explicit allow-list; anything else is forbidden
  IF (p_old = 'Pending'  AND p_new = 'Approved') OR
     (p_old = 'Pending'  AND p_new = 'Rejected') OR
     (p_old = 'Rejected' AND p_new = 'Pending')  OR
     (p_old = 'Rejected' AND p_new = 'Approved') OR
     (p_old = 'Approved' AND p_new = 'Rejected') THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Illegal family.status transition: % -> %', p_old, p_new
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

-- ─── approve_family ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION approve_family(
  p_family_id        UUID,
  p_expected_version INT,
  p_actor_id         UUID
) RETURNS families AS $$
DECLARE
  v_row       families;
  v_actor     members;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'approve_family: p_actor_id is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_row FROM families WHERE id = p_family_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Family % not found', p_family_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Optimistic concurrency
  IF v_row.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale version: expected %, actual %',
      p_expected_version, v_row.version
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM assert_family_transition(v_row.status, 'Approved');

  SELECT * INTO v_actor FROM members WHERE id = p_actor_id;

  UPDATE families
     SET status       = 'Approved',
         approved_at  = now(),
         approved_by  = p_actor_id,
         -- clear any stale rejection state so re-approve from Rejected is clean
         rejected_at  = NULL,
         rejected_by  = NULL,
         rejection_reason = NULL,
         version      = version + 1,
         updated_at   = now()
   WHERE id = p_family_id
   RETURNING * INTO v_row;

  INSERT INTO family_audit_log
    (family_id, actor_id, actor_email, actor_role, action, diff)
  VALUES
    (p_family_id, p_actor_id,
     coalesce(v_actor.email, 'system'),
     coalesce(v_actor.role,  'system'),
     'Approve',
     jsonb_build_object('status',
       jsonb_build_object('from', v_row.status, 'to', 'Approved')));

  RETURN v_row;
END;
$$ LANGUAGE plpgsql;

-- ─── reject_family ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reject_family(
  p_family_id        UUID,
  p_expected_version INT,
  p_actor_id         UUID,
  p_reason           TEXT
) RETURNS families AS $$
DECLARE
  v_row   families;
  v_actor members;
  v_old   TEXT;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'reject_family: p_actor_id is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_row FROM families WHERE id = p_family_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Family % not found', p_family_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_row.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale version: expected %, actual %',
      p_expected_version, v_row.version
      USING ERRCODE = 'P0002';
  END IF;

  v_old := v_row.status;
  PERFORM assert_family_transition(v_old, 'Rejected');

  SELECT * INTO v_actor FROM members WHERE id = p_actor_id;

  UPDATE families
     SET status           = 'Rejected',
         rejected_at      = now(),
         rejected_by      = p_actor_id,
         rejection_reason = nullif(btrim(p_reason), ''),
         -- If we are rejecting a previously-Approved family, clear the
         -- approval stamp so approved_at/approved_by is not misleading.
         approved_at      = NULL,
         approved_by      = NULL,
         version          = version + 1,
         updated_at       = now()
   WHERE id = p_family_id
   RETURNING * INTO v_row;

  INSERT INTO family_audit_log
    (family_id, actor_id, actor_email, actor_role, action, diff, note)
  VALUES
    (p_family_id, p_actor_id,
     coalesce(v_actor.email, 'system'),
     coalesce(v_actor.role,  'system'),
     'Reject',
     jsonb_build_object('status',
       jsonb_build_object('from', v_old, 'to', 'Rejected')),
     nullif(btrim(p_reason), ''));

  RETURN v_row;
END;
$$ LANGUAGE plpgsql;

-- ─── reopen_family (Rejected → Pending) ──────────────────────────────
CREATE OR REPLACE FUNCTION reopen_family(
  p_family_id        UUID,
  p_expected_version INT,
  p_actor_id         UUID
) RETURNS families AS $$
DECLARE
  v_row   families;
  v_actor members;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'reopen_family: p_actor_id is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_row FROM families WHERE id = p_family_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Family % not found', p_family_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_row.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale version: expected %, actual %',
      p_expected_version, v_row.version
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM assert_family_transition(v_row.status, 'Pending');

  SELECT * INTO v_actor FROM members WHERE id = p_actor_id;

  UPDATE families
     SET status           = 'Pending',
         rejected_at      = NULL,
         rejected_by      = NULL,
         rejection_reason = NULL,
         version          = version + 1,
         updated_at       = now()
   WHERE id = p_family_id
   RETURNING * INTO v_row;

  INSERT INTO family_audit_log
    (family_id, actor_id, actor_email, actor_role, action, diff)
  VALUES
    (p_family_id, p_actor_id,
     coalesce(v_actor.email, 'system'),
     coalesce(v_actor.role,  'system'),
     'Reopen',
     jsonb_build_object('status',
       jsonb_build_object('from', 'Rejected', 'to', 'Pending')));

  RETURN v_row;
END;
$$ LANGUAGE plpgsql;

-- ─── register_family ─────────────────────────────────────────────────
-- Creates families + family_members (1 Primary + up to 15 Secondary) +
-- optional family_events, and writes a 'Create' audit row. All atomic.
-- Body shape (p_body JSONB):
--   {
--     "primary":     { "given_name": "...", "initiated": false, ... ,
--                      "date_of_birth": "YYYY-MM-DD", "wedding_anniversary": "YYYY-MM-DD" },
--     "secondaries": [ { ... }, ... ],
--     "consent":     true
--   }
CREATE OR REPLACE FUNCTION register_family(
  p_body         JSONB,
  p_actor_email  TEXT
) RETURNS UUID AS $$
DECLARE
  v_family_id UUID;
  v_primary   JSONB := p_body -> 'primary';
  v_sec       JSONB;
  v_member_id UUID;
  v_dob       TEXT;
  v_ann       TEXT;
BEGIN
  IF coalesce((p_body ->> 'consent')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'consent is required'
      USING ERRCODE = 'check_violation';
  END IF;

  -- families row
  INSERT INTO families
    (primary_email, consent_given, consent_at)
  VALUES
    (lower(v_primary ->> 'email'), true, now())
  RETURNING id INTO v_family_id;

  -- Primary member
  INSERT INTO family_members
    (family_id, kind, given_name, initiated, initiated_name,
     relationship, relationship_other, age, gender, marital_status,
     email, phone)
  VALUES
    (v_family_id, 'Primary',
     v_primary ->> 'given_name',
     coalesce((v_primary ->> 'initiated')::boolean, false),
     v_primary ->> 'initiated_name',
     'Self', NULL,
     (v_primary ->> 'age')::int,
     v_primary ->> 'gender',
     v_primary ->> 'marital_status',
     lower(v_primary ->> 'email'),
     v_primary ->> 'phone')
  RETURNING id INTO v_member_id;

  -- Primary optional events
  v_dob := v_primary ->> 'date_of_birth';
  IF v_dob IS NOT NULL AND v_dob <> '' THEN
    INSERT INTO family_events (family_member_id, kind, event_date)
    VALUES (v_member_id, 'DateOfBirth', v_dob::date);
  END IF;
  v_ann := v_primary ->> 'wedding_anniversary';
  IF v_ann IS NOT NULL AND v_ann <> '' THEN
    INSERT INTO family_events (family_member_id, kind, event_date)
    VALUES (v_member_id, 'WeddingAnniversary', v_ann::date);
  END IF;

  -- Secondaries
  FOR v_sec IN
    SELECT jsonb_array_elements(coalesce(p_body -> 'secondaries', '[]'::jsonb))
  LOOP
    INSERT INTO family_members
      (family_id, kind, given_name, initiated, initiated_name,
       relationship, relationship_other, age, gender, marital_status,
       email, phone)
    VALUES
      (v_family_id, 'Secondary',
       v_sec ->> 'given_name',
       coalesce((v_sec ->> 'initiated')::boolean, false),
       v_sec ->> 'initiated_name',
       v_sec ->> 'relationship',
       v_sec ->> 'relationship_other',
       (v_sec ->> 'age')::int,
       v_sec ->> 'gender',
       v_sec ->> 'marital_status',
       lower(nullif(v_sec ->> 'email', '')),
       nullif(v_sec ->> 'phone', ''))
    RETURNING id INTO v_member_id;

    v_dob := v_sec ->> 'date_of_birth';
    IF v_dob IS NOT NULL AND v_dob <> '' THEN
      INSERT INTO family_events (family_member_id, kind, event_date)
      VALUES (v_member_id, 'DateOfBirth', v_dob::date);
    END IF;
    v_ann := v_sec ->> 'wedding_anniversary';
    IF v_ann IS NOT NULL AND v_ann <> '' THEN
      INSERT INTO family_events (family_member_id, kind, event_date)
      VALUES (v_member_id, 'WeddingAnniversary', v_ann::date);
    END IF;
  END LOOP;

  -- Audit row
  INSERT INTO family_audit_log
    (family_id, actor_id, actor_email, actor_role, action, diff)
  VALUES
    (v_family_id, NULL, lower(p_actor_email), 'system', 'Create', '{}'::jsonb);

  RETURN v_family_id;
END;
$$ LANGUAGE plpgsql;

-- ─── delete_family (hard-delete + tombstone audit) ───────────────────
-- Used for clean-up of test / spam families. CASCADE removes all children;
-- we write a final 'Delete' audit row first so the tombstone survives.
CREATE OR REPLACE FUNCTION delete_family(
  p_family_id UUID,
  p_actor_id  UUID
) RETURNS void AS $$
DECLARE
  v_row       families;
  v_actor     members;
  v_summary   JSONB;
BEGIN
  SELECT * INTO v_row FROM families WHERE id = p_family_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Family % not found', p_family_id USING ERRCODE = 'no_data_found';
  END IF;

  SELECT * INTO v_actor FROM members WHERE id = p_actor_id;

  v_summary := jsonb_build_object(
    'primary_email', v_row.primary_email,
    'status_at_delete', v_row.status,
    'member_count', (SELECT count(*) FROM family_members WHERE family_id = p_family_id)
  );

  INSERT INTO family_audit_log
    (family_id, actor_id, actor_email, actor_role, action, diff)
  VALUES
    (p_family_id, p_actor_id,
     coalesce(v_actor.email, 'system'),
     coalesce(v_actor.role,  'system'),
     'Delete', v_summary);

  DELETE FROM families WHERE id = p_family_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION approve_family IS
  'State transition Pending|Rejected -> Approved with optimistic version check.';
COMMENT ON FUNCTION reject_family IS
  'State transition Pending|Approved -> Rejected with optimistic version check.';
COMMENT ON FUNCTION reopen_family IS
  'State transition Rejected -> Pending with optimistic version check.';
COMMENT ON FUNCTION register_family IS
  'Atomic insert of families + family_members + family_events + Create audit row.';
COMMENT ON FUNCTION delete_family IS
  'Hard-delete with tombstone audit row (cascades to all children).';
