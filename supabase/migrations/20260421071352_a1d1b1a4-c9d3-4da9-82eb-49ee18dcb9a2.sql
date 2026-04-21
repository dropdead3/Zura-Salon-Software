CREATE TABLE IF NOT EXISTS public.org_setup_user_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snoozed_until TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  backfill_attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE public.org_setup_user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own setup state"
  ON public.org_setup_user_state FOR SELECT
  USING (auth.uid() = user_id OR public.is_platform_user(auth.uid()));

CREATE POLICY "Users insert own setup state"
  ON public.org_setup_user_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own setup state"
  ON public.org_setup_user_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_org_setup_user_state_updated_at
  BEFORE UPDATE ON public.org_setup_user_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_org_setup_user_state_user_org
  ON public.org_setup_user_state(user_id, organization_id);