
-- Wave 13G.G — exact retry tracking for org_setup_step_completion.

ALTER TABLE public.org_setup_step_completion
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1;

-- Atomic upsert RPC: insert with attempt_count=1, or on conflict bump by +1.
-- SECURITY DEFINER so the orchestrator can call it with the caller's user_id
-- (passed explicitly) while still enforcing org admin via is_org_admin.
CREATE OR REPLACE FUNCTION public.upsert_org_setup_step_completion(
  p_organization_id UUID,
  p_step_key TEXT,
  p_status TEXT,
  p_data JSONB,
  p_completion_source TEXT,
  p_completed_version INTEGER,
  p_user_id UUID
)
RETURNS public.org_setup_step_completion
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.org_setup_step_completion;
BEGIN
  IF NOT public.is_org_admin(p_user_id, p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized to record step completion for this organization';
  END IF;

  INSERT INTO public.org_setup_step_completion (
    organization_id,
    step_key,
    status,
    data,
    completion_source,
    completed_version,
    completed_at,
    attempt_count
  )
  VALUES (
    p_organization_id,
    p_step_key,
    p_status,
    COALESCE(p_data, '{}'::jsonb),
    p_completion_source,
    p_completed_version,
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
    1
  )
  ON CONFLICT (organization_id, step_key) DO UPDATE
    SET status = EXCLUDED.status,
        data = EXCLUDED.data,
        completion_source = EXCLUDED.completion_source,
        completed_version = EXCLUDED.completed_version,
        completed_at = CASE
          WHEN EXCLUDED.status = 'completed' THEN now()
          ELSE public.org_setup_step_completion.completed_at
        END,
        attempt_count = public.org_setup_step_completion.attempt_count + 1,
        updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_org_setup_step_completion(
  UUID, TEXT, TEXT, JSONB, TEXT, INTEGER, UUID
) TO authenticated;
