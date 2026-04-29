-- Wave 3: Anomaly Detection table + RPCs

CREATE TABLE IF NOT EXISTS public.ai_action_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  anomaly_type text NOT NULL CHECK (anomaly_type IN (
    'rate_limit_hit',
    'repeated_denials',
    'kill_switch_attempt',
    'permission_denied_burst',
    'high_risk_burst',
    'invalid_param_burst'
  )),
  capability_id text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_anomalies_org_unack
  ON public.ai_action_anomalies (organization_id, last_seen_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_action_anomalies_user
  ON public.ai_action_anomalies (user_id, last_seen_at DESC);

ALTER TABLE public.ai_action_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view anomalies"
  ON public.ai_action_anomalies FOR SELECT
  TO authenticated
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

CREATE POLICY "Org admins can update anomalies"
  ON public.ai_action_anomalies FOR UPDATE
  TO authenticated
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  )
  WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.is_platform_user(auth.uid())
  );

CREATE POLICY "Deny client inserts on anomalies"
  ON public.ai_action_anomalies FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.record_ai_anomaly(
  p_org uuid,
  p_user uuid,
  p_type text,
  p_capability text,
  p_severity text,
  p_details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_window timestamptz := now() - interval '15 minutes';
  v_id uuid;
BEGIN
  SELECT id INTO v_existing
  FROM public.ai_action_anomalies
  WHERE organization_id = p_org
    AND user_id = p_user
    AND anomaly_type = p_type
    AND COALESCE(capability_id,'') = COALESCE(p_capability,'')
    AND last_seen_at > v_window
    AND acknowledged_at IS NULL
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.ai_action_anomalies
    SET count = count + 1,
        last_seen_at = now(),
        severity = CASE
          WHEN p_severity = 'critical' THEN 'critical'
          WHEN severity = 'critical' THEN 'critical'
          WHEN p_severity = 'high' OR severity = 'high' THEN 'high'
          ELSE severity
        END,
        details = details || COALESCE(p_details, '{}'::jsonb)
    WHERE id = v_existing
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.ai_action_anomalies (
      organization_id, user_id, anomaly_type, capability_id, severity, details
    ) VALUES (
      p_org, p_user, p_type, p_capability, COALESCE(p_severity,'medium'), COALESCE(p_details, '{}'::jsonb)
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_ai_anomaly(uuid, uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ai_anomaly(uuid, uuid, text, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.acknowledge_ai_anomaly(p_anomaly uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org
  FROM public.ai_action_anomalies
  WHERE id = p_anomaly;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Anomaly not found';
  END IF;

  IF NOT (public.is_org_admin(auth.uid(), v_org) OR public.is_platform_user(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.ai_action_anomalies
  SET acknowledged_at = now(),
      acknowledged_by = auth.uid()
  WHERE id = p_anomaly;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_ai_anomaly(uuid) TO authenticated;