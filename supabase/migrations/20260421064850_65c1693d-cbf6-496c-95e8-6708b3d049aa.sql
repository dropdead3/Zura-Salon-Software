CREATE TABLE IF NOT EXISTS public.setup_outreach_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_label TEXT,
  exported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS setup_outreach_log_org_step_idx
  ON public.setup_outreach_log (organization_id, step_number, exported_at DESC);

CREATE INDEX IF NOT EXISTS setup_outreach_log_exported_at_idx
  ON public.setup_outreach_log (exported_at DESC);

ALTER TABLE public.setup_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform users can view outreach log"
  ON public.setup_outreach_log
  FOR SELECT
  TO authenticated
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can insert outreach log"
  ON public.setup_outreach_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can manage outreach log"
  ON public.setup_outreach_log
  FOR ALL
  TO authenticated
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));