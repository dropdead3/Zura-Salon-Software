
-- Wave 28.5: Applicability + Surface Mapping RPCs

-- Track when a surface mapping was auto-suggested vs manually wired
ALTER TABLE public.policy_surface_mappings
  ADD COLUMN IF NOT EXISTS auto_assigned_at TIMESTAMPTZ DEFAULT NULL;

-- Atomically replace the applicability rows for a draft version.
-- Caller passes a JSON array of { scope_type, scope_value }.
CREATE OR REPLACE FUNCTION public.save_policy_applicability(
  p_version_id UUID,
  p_rows JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_caller UUID := auth.uid();
BEGIN
  SELECT pv.policy_id, p.organization_id
    INTO v_org_id
  FROM public.policy_versions pv
  JOIN public.policies p ON p.id = pv.policy_id
  WHERE pv.id = p_version_id
  LIMIT 1;

  -- Re-derive org_id explicitly (the join above only returned one column slot)
  SELECT p.organization_id INTO v_org_id
  FROM public.policy_versions pv
  JOIN public.policies p ON p.id = pv.policy_id
  WHERE pv.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Policy version not found';
  END IF;

  IF NOT public.is_org_admin(v_caller, v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.policy_applicability WHERE version_id = p_version_id;

  IF p_rows IS NULL OR jsonb_array_length(p_rows) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.policy_applicability (version_id, organization_id, scope_type, scope_value)
  SELECT
    p_version_id,
    v_org_id,
    (elem->>'scope_type')::policy_scope_type,
    elem->>'scope_value'
  FROM jsonb_array_elements(p_rows) AS elem
  ON CONFLICT (version_id, scope_type, scope_value) DO NOTHING;
END;
$$;

-- Atomically replace surface mappings for a version.
-- Caller passes a JSON array of { surface, variant_type, enabled, surface_config }.
CREATE OR REPLACE FUNCTION public.save_policy_surface_mappings(
  p_version_id UUID,
  p_rows JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_caller UUID := auth.uid();
BEGIN
  SELECT p.organization_id INTO v_org_id
  FROM public.policy_versions pv
  JOIN public.policies p ON p.id = pv.policy_id
  WHERE pv.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Policy version not found';
  END IF;

  IF NOT public.is_org_admin(v_caller, v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.policy_surface_mappings WHERE version_id = p_version_id;

  IF p_rows IS NULL OR jsonb_array_length(p_rows) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.policy_surface_mappings (
    version_id, organization_id, surface, variant_type, enabled, surface_config
  )
  SELECT
    p_version_id,
    v_org_id,
    (elem->>'surface')::policy_surface,
    COALESCE((elem->>'variant_type')::policy_variant_type, 'internal'::policy_variant_type),
    COALESCE((elem->>'enabled')::boolean, true),
    COALESCE(elem->'surface_config', '{}'::jsonb)
  FROM jsonb_array_elements(p_rows) AS elem
  ON CONFLICT (version_id, surface) DO NOTHING;
END;
$$;
