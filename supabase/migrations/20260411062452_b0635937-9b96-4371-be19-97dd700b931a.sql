
-- Create seo_autonomous_actions table
CREATE TABLE IF NOT EXISTS public.seo_autonomous_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID,
  template_key TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'auto_executed',
  confidence_score NUMERIC,
  predicted_lift NUMERIC,
  content_applied JSONB,
  rollback_data JSONB,
  measured_impact JSONB,
  status TEXT NOT NULL DEFAULT 'executed',
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_autonomous_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view autonomous actions"
  ON public.seo_autonomous_actions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage autonomous actions"
  ON public.seo_autonomous_actions FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_seo_autonomous_actions_org
  ON public.seo_autonomous_actions(organization_id);

CREATE INDEX IF NOT EXISTS idx_seo_autonomous_actions_executed_at
  ON public.seo_autonomous_actions(organization_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_seo_autonomous_actions_template
  ON public.seo_autonomous_actions(organization_id, template_key, executed_at DESC);

CREATE TRIGGER update_seo_autonomous_actions_updated_at
  BEFORE UPDATE ON public.seo_autonomous_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create seo_growth_reports table
CREATE TABLE IF NOT EXISTS public.seo_growth_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  actions_taken JSONB NOT NULL DEFAULT '[]'::jsonb,
  impact_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  remaining_opportunity NUMERIC,
  next_best_action JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_growth_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view growth reports"
  ON public.seo_growth_reports FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage growth reports"
  ON public.seo_growth_reports FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_seo_growth_reports_org_date
  ON public.seo_growth_reports(organization_id, report_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_growth_reports_unique_date
  ON public.seo_growth_reports(organization_id, report_date);
