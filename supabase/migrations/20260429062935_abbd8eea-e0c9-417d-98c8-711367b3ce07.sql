
-- ============================================================
-- ai_action_rate_limits — sliding-window counters per user/org
-- ============================================================
CREATE TABLE public.ai_action_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('propose', 'execute')),
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, bucket, window_start)
);

CREATE INDEX idx_ai_rate_limits_lookup
  ON public.ai_action_rate_limits (organization_id, user_id, bucket, window_start DESC);

ALTER TABLE public.ai_action_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their rate limits"
  ON public.ai_action_rate_limits FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Writes only via service role (edge functions). Deny client writes.
CREATE POLICY "Deny client writes on rate limits"
  ON public.ai_action_rate_limits FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client updates on rate limits"
  ON public.ai_action_rate_limits FOR UPDATE TO authenticated USING (false);

-- ============================================================
-- ai_capability_kill_switches — per-org disable overrides
-- ============================================================
CREATE TABLE public.ai_capability_kill_switches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  capability_id text NOT NULL,
  disabled boolean NOT NULL DEFAULT true,
  reason text,
  disabled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, capability_id)
);

CREATE INDEX idx_ai_kill_switches_org
  ON public.ai_capability_kill_switches (organization_id, capability_id);

ALTER TABLE public.ai_capability_kill_switches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view kill switches"
  ON public.ai_capability_kill_switches FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Only Account Owners (super_admin in employee_profiles) or platform staff may write.
CREATE POLICY "Account owners can insert kill switches"
  ON public.ai_capability_kill_switches FOR INSERT TO authenticated
  WITH CHECK (
    is_platform_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employee_profiles
      WHERE user_id = auth.uid()
        AND organization_id = ai_capability_kill_switches.organization_id
        AND is_super_admin = true
    )
  );

CREATE POLICY "Account owners can update kill switches"
  ON public.ai_capability_kill_switches FOR UPDATE TO authenticated
  USING (
    is_platform_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employee_profiles
      WHERE user_id = auth.uid()
        AND organization_id = ai_capability_kill_switches.organization_id
        AND is_super_admin = true
    )
  );

CREATE POLICY "Account owners can delete kill switches"
  ON public.ai_capability_kill_switches FOR DELETE TO authenticated
  USING (
    is_platform_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employee_profiles
      WHERE user_id = auth.uid()
        AND organization_id = ai_capability_kill_switches.organization_id
        AND is_super_admin = true
    )
  );

CREATE TRIGGER trg_ai_rate_limits_updated_at
  BEFORE UPDATE ON public.ai_action_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ai_kill_switches_updated_at
  BEFORE UPDATE ON public.ai_capability_kill_switches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
