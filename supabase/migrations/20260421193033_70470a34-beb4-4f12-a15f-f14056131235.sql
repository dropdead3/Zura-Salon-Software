CREATE OR REPLACE FUNCTION public.save_policy_rule_blocks(p_version_id uuid, p_blocks jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    INSERT INTO public.policy_rule_blocks (version_id, organization_id, block_key, rule_type, value, required, ordering)
    VALUES (
      p_version_id,
      v_org_id,
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
$function$;