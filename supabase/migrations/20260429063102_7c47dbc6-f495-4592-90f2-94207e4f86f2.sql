
CREATE OR REPLACE FUNCTION public.increment_ai_rate_limit(
  p_org uuid,
  p_user uuid,
  p_bucket text,
  p_window timestamptz
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  IF p_bucket NOT IN ('propose', 'execute') THEN
    RAISE EXCEPTION 'invalid bucket';
  END IF;

  INSERT INTO public.ai_action_rate_limits (organization_id, user_id, bucket, window_start, count)
  VALUES (p_org, p_user, p_bucket, p_window, 1)
  ON CONFLICT (organization_id, user_id, bucket, window_start)
  DO UPDATE SET count = ai_action_rate_limits.count + 1, updated_at = now()
  RETURNING count INTO new_count;

  RETURN new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_ai_rate_limit(uuid, uuid, text, timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_rate_limit(uuid, uuid, text, timestamptz) TO service_role;
