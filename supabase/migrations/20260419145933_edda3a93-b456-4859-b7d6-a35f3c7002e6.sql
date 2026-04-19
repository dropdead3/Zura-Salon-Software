-- Wave 28.4 — Policy Configurator
-- Add per-library schema reference + helper RPCs for structured rule editing.

-- 1. Add a 'configurator_schema_key' to library entries so each policy can declare
--    which decision-tree shape it uses. Multiple policies can share a schema
--    (e.g., 'cancellation' shape applies to cancellation, no-show, late arrival).
ALTER TABLE public.policy_library
  ADD COLUMN IF NOT EXISTS configurator_schema_key TEXT;

-- Backfill schema keys based on library_key patterns. Schemas are interpreted client-side.
UPDATE public.policy_library SET configurator_schema_key = CASE
  WHEN key IN ('cancellation', 'no_show', 'late_arrival') THEN 'cancellation_shape'
  WHEN key IN ('deposit', 'card_on_file') THEN 'deposit_shape'
  WHEN key IN ('redo', 'refund', 'service_guarantee') THEN 'service_recovery_shape'
  WHEN key IN ('retail_return', 'retail_exchange') THEN 'retail_return_shape'
  WHEN key IN ('extension_warranty', 'extension_aftercare', 'extension_consultation', 'extension_custom_order', 'extension_removal') THEN 'extension_shape'
  WHEN key IN ('package_expiration', 'package_transfer', 'membership_terms', 'gift_card_terms') THEN 'package_shape'
  WHEN key IN ('photo_consent', 'minor_consent', 'hair_history_consent', 'allergy_disclosure') THEN 'consent_shape'
  WHEN key IN ('exception_authority', 'goodwill_authority', 'refund_authority', 'comp_authority', 'escalation_path') THEN 'authority_shape'
  WHEN key IN ('discipline', 'attendance', 'dress_code', 'social_media', 'confidentiality', 'harassment', 'safety', 'drug_alcohol') THEN 'team_conduct_shape'
  WHEN key IN ('pto', 'sick_leave', 'bereavement', 'jury_duty', 'parental_leave') THEN 'time_off_shape'
  WHEN key IN ('commission', 'tip_pooling', 'overtime', 'pay_schedule') THEN 'compensation_shape'
  ELSE 'generic_shape'
END
WHERE configurator_schema_key IS NULL;

-- 2. RPC: adopt_and_init_policy
--    Idempotently adopt a single library policy AND ensure a draft version exists
--    so the configurator always has somewhere to write rule blocks to.
CREATE OR REPLACE FUNCTION public.adopt_and_init_policy(
  p_organization_id UUID,
  p_library_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy_id UUID;
  v_version_id UUID;
  v_lib RECORD;
BEGIN
  -- Authorization
  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_lib FROM public.policy_library WHERE key = p_library_key;
  IF v_lib IS NULL THEN
    RAISE EXCEPTION 'Library policy not found: %', p_library_key;
  END IF;

  -- Upsert policy instance
  INSERT INTO public.policies (
    organization_id, library_key, category, audience,
    internal_title, intent, status, primary_owner_role
  )
  VALUES (
    p_organization_id, v_lib.key, v_lib.category, v_lib.audience,
    v_lib.title, v_lib.short_description, 'drafting', v_lib.default_owner_role
  )
  ON CONFLICT (organization_id, library_key) DO UPDATE
    SET updated_at = now()
  RETURNING id INTO v_policy_id;

  -- Ensure a draft version exists
  SELECT id INTO v_version_id
  FROM public.policy_versions
  WHERE policy_id = v_policy_id AND effective_to IS NULL
  LIMIT 1;

  IF v_version_id IS NULL THEN
    INSERT INTO public.policy_versions (policy_id, version_number, effective_from, changelog_summary)
    VALUES (v_policy_id, 1, now(), 'Initial draft')
    RETURNING id INTO v_version_id;

    UPDATE public.policies SET current_version_id = v_version_id WHERE id = v_policy_id;
  END IF;

  RETURN v_policy_id;
END;
$$;

-- 3. RPC: save_policy_rule_blocks
--    Replace the rule block set for a policy version atomically.
CREATE OR REPLACE FUNCTION public.save_policy_rule_blocks(
  p_version_id UUID,
  p_blocks JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy_id UUID;
  v_org_id UUID;
  v_block JSONB;
  v_idx INT := 0;
BEGIN
  SELECT pv.policy_id, p.organization_id INTO v_policy_id, v_org_id
  FROM public.policy_versions pv
  JOIN public.policies p ON p.id = pv.policy_id
  WHERE pv.id = p_version_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Replace
  DELETE FROM public.policy_rule_blocks WHERE version_id = p_version_id;

  FOR v_block IN SELECT * FROM jsonb_array_elements(p_blocks) LOOP
    INSERT INTO public.policy_rule_blocks (version_id, block_key, rule_type, value, required, ordering)
    VALUES (
      p_version_id,
      v_block->>'block_key',
      COALESCE(v_block->>'rule_type', 'value'),
      COALESCE(v_block->'value', 'null'::jsonb),
      COALESCE((v_block->>'required')::boolean, false),
      v_idx
    );
    v_idx := v_idx + 1;
  END LOOP;

  -- Touch the policy + version
  UPDATE public.policies SET updated_at = now(), status = 'configured'
    WHERE id = v_policy_id AND status = 'drafting';
  UPDATE public.policy_versions SET changelog_summary = 'Rules updated' WHERE id = p_version_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adopt_and_init_policy(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_policy_rule_blocks(UUID, JSONB) TO authenticated;