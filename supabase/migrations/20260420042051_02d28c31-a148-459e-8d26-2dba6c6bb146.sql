
-- ============================================================
-- Wave 28.11.1 — Make Publish Real
-- ============================================================

-- Helper: recompute a single policy's status based on its current state.
-- Idempotent. Safe to call from triggers and RPCs.
CREATE OR REPLACE FUNCTION public.recompute_policy_status(p_policy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version_id uuid;
  v_audience policy_audience;
  v_status policy_status;
  v_new_status policy_status;
  v_required_rule_count int;
  v_satisfied_rule_count int;
  v_has_internal_approved boolean;
  v_has_client_approved boolean;
  v_is_published_external boolean;
  v_has_surface_mappings boolean;
  v_schema_key text;
BEGIN
  SELECT current_version_id, audience, status
    INTO v_current_version_id, v_audience, v_status
  FROM public.policies
  WHERE id = p_policy_id;

  IF v_current_version_id IS NULL THEN
    RETURN;  -- nothing to recompute
  END IF;

  -- Don't auto-mutate archived policies; operator owns that state.
  IF v_status = 'archived' THEN
    RETURN;
  END IF;

  -- Pull latest version snapshot
  SELECT pv.is_published_external
    INTO v_is_published_external
  FROM public.policy_versions pv
  WHERE pv.id = v_current_version_id;

  -- Are required rule blocks satisfied?
  -- Pull schema_key and consult the count of *non-empty* required blocks
  -- against expected. If we can't determine schema-required count from the
  -- DB, we fall back to "any block exists ⇒ configured".
  SELECT pl.configurator_schema_key
    INTO v_schema_key
  FROM public.policies p
  JOIN public.policy_library pl ON pl.key = p.library_key
  WHERE p.id = p_policy_id;

  SELECT count(*) FILTER (WHERE prb.required = true)
    INTO v_required_rule_count
  FROM public.policy_rule_blocks prb
  WHERE prb.version_id = v_current_version_id;

  SELECT count(*) FILTER (
    WHERE prb.required = true
      AND prb.value IS NOT NULL
      AND prb.value::text NOT IN ('null', '""', '{}', '{"v": null}', '{"v":null}')
  )
    INTO v_satisfied_rule_count
  FROM public.policy_rule_blocks prb
  WHERE prb.version_id = v_current_version_id;

  -- Variant approval state
  SELECT
    bool_or(approved AND variant_type = 'internal'),
    bool_or(approved AND variant_type = 'client')
  INTO v_has_internal_approved, v_has_client_approved
  FROM public.policy_variants
  WHERE version_id = v_current_version_id;

  v_has_internal_approved := COALESCE(v_has_internal_approved, false);
  v_has_client_approved := COALESCE(v_has_client_approved, false);

  -- Has any enabled surface mapping on the current version?
  SELECT EXISTS (
    SELECT 1 FROM public.policy_surface_mappings psm
    WHERE psm.version_id = v_current_version_id
      AND psm.enabled = true
  )
  INTO v_has_surface_mappings;

  -- Status promotion ladder (highest match wins).
  -- 'wired'              : published_external + has surface mappings
  -- 'published_external' : is_published_external = true
  -- 'approved_internal'  : at least one approved variant exists for the audience
  -- 'configured'         : all required rule blocks satisfied (or any block exists if no required blocks)
  -- 'drafting'           : at least one rule block exists but required not satisfied
  -- 'not_started'        : no rule blocks
  IF v_is_published_external = true AND v_has_surface_mappings THEN
    v_new_status := 'wired';
  ELSIF v_is_published_external = true THEN
    v_new_status := 'published_external';
  ELSIF (v_audience IN ('external', 'both') AND v_has_client_approved)
     OR (v_audience = 'internal' AND v_has_internal_approved)
     OR (v_audience = 'both' AND v_has_internal_approved) THEN
    v_new_status := 'approved_internal';
  ELSIF v_required_rule_count > 0 AND v_satisfied_rule_count = v_required_rule_count THEN
    v_new_status := 'configured';
  ELSIF EXISTS (
    SELECT 1 FROM public.policy_rule_blocks WHERE version_id = v_current_version_id
  ) THEN
    -- No required blocks but blocks exist ⇒ configured
    IF v_required_rule_count = 0 THEN
      v_new_status := 'configured';
    ELSE
      v_new_status := 'drafting';
    END IF;
  ELSE
    v_new_status := 'not_started';
  END IF;

  IF v_new_status IS DISTINCT FROM v_status THEN
    UPDATE public.policies
    SET status = v_new_status,
        updated_at = now()
    WHERE id = p_policy_id;
  END IF;
END;
$$;

-- Operator-callable: publish (or unpublish) the current_version of a policy externally.
-- Validates an approved client variant exists when publishing audience-external policies.
CREATE OR REPLACE FUNCTION public.publish_policy_externally(
  p_policy_id uuid,
  p_publish boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_audience policy_audience;
  v_current_version_id uuid;
  v_actor uuid := auth.uid();
  v_has_client_approved boolean;
  v_was_published boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id, audience, current_version_id
    INTO v_org_id, v_audience, v_current_version_id
  FROM public.policies
  WHERE id = p_policy_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Policy not found';
  END IF;

  IF NOT public.is_org_admin(v_actor, v_org_id) THEN
    RAISE EXCEPTION 'Only organization admins can publish policies';
  END IF;

  IF v_current_version_id IS NULL THEN
    RAISE EXCEPTION 'Policy has no current version';
  END IF;

  IF p_publish AND v_audience NOT IN ('external', 'both') THEN
    RAISE EXCEPTION 'Only external or both audience policies can be published to the client policy center';
  END IF;

  IF p_publish THEN
    SELECT EXISTS (
      SELECT 1 FROM public.policy_variants
      WHERE version_id = v_current_version_id
        AND variant_type = 'client'
        AND approved = true
    ) INTO v_has_client_approved;
    IF NOT v_has_client_approved THEN
      RAISE EXCEPTION 'Approve a client-facing variant before publishing externally';
    END IF;
  END IF;

  SELECT is_published_external INTO v_was_published
  FROM public.policy_versions
  WHERE id = v_current_version_id;

  -- Idempotent: if state already matches, return early.
  IF v_was_published = p_publish THEN
    RETURN jsonb_build_object(
      'changed', false,
      'is_published_external', p_publish,
      'policy_id', p_policy_id,
      'version_id', v_current_version_id
    );
  END IF;

  UPDATE public.policy_versions
  SET is_published_external = p_publish,
      updated_at = now()
  WHERE id = v_current_version_id;

  -- Recompute status based on new state
  PERFORM public.recompute_policy_status(p_policy_id);

  -- Audit log
  INSERT INTO public.policy_change_log (
    organization_id, policy_id, version_id, actor_user_id,
    event_type, previous_value, new_value, metadata
  ) VALUES (
    v_org_id, p_policy_id, v_current_version_id, v_actor,
    CASE WHEN p_publish THEN 'published_external' ELSE 'unpublished_external' END,
    jsonb_build_object('is_published_external', v_was_published),
    jsonb_build_object('is_published_external', p_publish),
    jsonb_build_object('source', 'publish_policy_externally')
  );

  RETURN jsonb_build_object(
    'changed', true,
    'is_published_external', p_publish,
    'policy_id', p_policy_id,
    'version_id', v_current_version_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_policy_externally(uuid, boolean) TO authenticated;

-- ------------------------------------------------------------
-- Auto-recompute triggers: call recompute_policy_status whenever
-- the underlying signals change.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._tg_recompute_from_rule_blocks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id uuid;
  v_policy_id uuid;
BEGIN
  v_version_id := COALESCE(NEW.version_id, OLD.version_id);
  SELECT policy_id INTO v_policy_id FROM public.policy_versions WHERE id = v_version_id;
  IF v_policy_id IS NOT NULL THEN
    PERFORM public.recompute_policy_status(v_policy_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_status_on_rule_blocks ON public.policy_rule_blocks;
CREATE TRIGGER recompute_status_on_rule_blocks
AFTER INSERT OR UPDATE OR DELETE ON public.policy_rule_blocks
FOR EACH ROW EXECUTE FUNCTION public._tg_recompute_from_rule_blocks();

CREATE OR REPLACE FUNCTION public._tg_recompute_from_variants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id uuid;
  v_policy_id uuid;
BEGIN
  v_version_id := COALESCE(NEW.version_id, OLD.version_id);
  SELECT policy_id INTO v_policy_id FROM public.policy_versions WHERE id = v_version_id;
  IF v_policy_id IS NOT NULL THEN
    PERFORM public.recompute_policy_status(v_policy_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_status_on_variants ON public.policy_variants;
CREATE TRIGGER recompute_status_on_variants
AFTER INSERT OR UPDATE OR DELETE ON public.policy_variants
FOR EACH ROW EXECUTE FUNCTION public._tg_recompute_from_variants();

CREATE OR REPLACE FUNCTION public._tg_recompute_from_surface_mappings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id uuid;
  v_policy_id uuid;
BEGIN
  v_version_id := COALESCE(NEW.version_id, OLD.version_id);
  SELECT policy_id INTO v_policy_id FROM public.policy_versions WHERE id = v_version_id;
  IF v_policy_id IS NOT NULL THEN
    PERFORM public.recompute_policy_status(v_policy_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_status_on_surface_mappings ON public.policy_surface_mappings;
CREATE TRIGGER recompute_status_on_surface_mappings
AFTER INSERT OR UPDATE OR DELETE ON public.policy_surface_mappings
FOR EACH ROW EXECUTE FUNCTION public._tg_recompute_from_surface_mappings();

-- ------------------------------------------------------------
-- One-time backfill: recompute every existing policy so health strip
-- starts showing accurate counts on first reload.
-- ------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.policies LOOP
    PERFORM public.recompute_policy_status(r.id);
  END LOOP;
END $$;
