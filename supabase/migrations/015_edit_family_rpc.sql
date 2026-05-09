-- Migration 015: edit_family RPC.
-- Applies a Primary edit of a family's membership + events + profile fields
-- atomically, bumping version, re-capturing consent when provided, and
-- writing exactly one audit row per save (FR-10.7).
--
-- p_body JSONB shape (see design §7.5):
--   {
--     "expectedVersion": 7,
--     "primary":     { "id": "...", "given_name": "...", ... },
--     "secondaries": [
--       { "id": "...", "_op": "keep"|"delete", ... },
--       {             "_op": "create",        ... }
--     ],
--     "consent_if_material": true          -- only when material change
--   }
-- p_diff JSONB shape: { added: [...], removed: [...], changed: [...] }

CREATE OR REPLACE FUNCTION edit_family(
  p_family_id        UUID,
  p_expected_version INT,
  p_actor_id         UUID,
  p_body             JSONB,
  p_diff             JSONB
) RETURNS families AS $$
DECLARE
  v_row       families;
  v_actor     members;
  v_primary   JSONB := p_body -> 'primary';
  v_sec       JSONB;
  v_ids       UUID[] := '{}';
  v_member_id UUID;
  v_consent   BOOLEAN := coalesce((p_body ->> 'consent_if_material')::boolean, false);
  v_dob       TEXT;
  v_ann       TEXT;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'edit_family: p_actor_id is required'
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

  -- FR-12.1: the Primary's id must be supplied and must still exist
  IF v_primary ->> 'id' IS NULL THEN
    RAISE EXCEPTION 'edit_family: primary.id is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- FR-10.3: primary_email is immutable. We do NOT read it from p_body.
  -- Update other Primary fields.
  UPDATE family_members
     SET given_name     = v_primary ->> 'given_name',
         initiated      = coalesce((v_primary ->> 'initiated')::boolean, false),
         initiated_name = v_primary ->> 'initiated_name',
         age            = (v_primary ->> 'age')::int,
         gender         = v_primary ->> 'gender',
         marital_status = v_primary ->> 'marital_status',
         phone          = v_primary ->> 'phone',
         updated_at     = now()
   WHERE id = (v_primary ->> 'id')::uuid
     AND family_id = p_family_id
     AND kind = 'Primary';

  -- Replace Primary DOB / anniversary if provided (simple upsert pattern).
  DELETE FROM family_events
   WHERE family_member_id = (v_primary ->> 'id')::uuid;
  v_dob := v_primary ->> 'date_of_birth';
  IF v_dob IS NOT NULL AND v_dob <> '' THEN
    INSERT INTO family_events (family_member_id, kind, event_date)
    VALUES ((v_primary ->> 'id')::uuid, 'DateOfBirth', v_dob::date);
  END IF;
  v_ann := v_primary ->> 'wedding_anniversary';
  IF v_ann IS NOT NULL AND v_ann <> '' THEN
    INSERT INTO family_events (family_member_id, kind, event_date)
    VALUES ((v_primary ->> 'id')::uuid, 'WeddingAnniversary', v_ann::date);
  END IF;

  -- Walk secondaries by op.
  FOR v_sec IN
    SELECT jsonb_array_elements(coalesce(p_body -> 'secondaries', '[]'::jsonb))
  LOOP
    IF (v_sec ->> '_op') = 'delete' THEN
      DELETE FROM family_members
       WHERE id = (v_sec ->> 'id')::uuid AND family_id = p_family_id AND kind = 'Secondary';
      CONTINUE;
    END IF;

    IF (v_sec ->> '_op') = 'create' OR (v_sec ->> 'id') IS NULL THEN
      INSERT INTO family_members
        (family_id, kind, given_name, initiated, initiated_name,
         relationship, relationship_other, age, gender, marital_status,
         email, phone)
      VALUES
        (p_family_id, 'Secondary',
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
    ELSE
      -- keep / update existing
      UPDATE family_members
         SET given_name         = v_sec ->> 'given_name',
             initiated          = coalesce((v_sec ->> 'initiated')::boolean, false),
             initiated_name     = v_sec ->> 'initiated_name',
             relationship       = v_sec ->> 'relationship',
             relationship_other = v_sec ->> 'relationship_other',
             age                = (v_sec ->> 'age')::int,
             gender             = v_sec ->> 'gender',
             marital_status     = v_sec ->> 'marital_status',
             email              = lower(nullif(v_sec ->> 'email', '')),
             phone              = nullif(v_sec ->> 'phone', ''),
             updated_at         = now()
       WHERE id = (v_sec ->> 'id')::uuid
         AND family_id = p_family_id
         AND kind = 'Secondary'
       RETURNING id INTO v_member_id;
    END IF;

    IF v_member_id IS NOT NULL THEN
      -- Rewrite events for this secondary (simple approach; no history needed).
      DELETE FROM family_events WHERE family_member_id = v_member_id;
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
      v_ids := array_append(v_ids, v_member_id);
    END IF;
  END LOOP;

  -- If consent was re-captured, update families.consent_at.
  UPDATE families
     SET consent_at = CASE WHEN v_consent THEN now() ELSE consent_at END,
         version    = version + 1,
         updated_at = now()
   WHERE id = p_family_id
   RETURNING * INTO v_row;

  SELECT * INTO v_actor FROM members WHERE id = p_actor_id;

  INSERT INTO family_audit_log
    (family_id, actor_id, actor_email, actor_role, action, diff)
  VALUES
    (p_family_id, p_actor_id,
     coalesce(v_actor.email, 'system'),
     coalesce(v_actor.role, 'system'),
     'Edit',
     coalesce(p_diff, '{}'::jsonb));

  RETURN v_row;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION edit_family IS
  'Atomic primary-edit of a family: member upserts + event rewrites + version bump + single audit row.';
