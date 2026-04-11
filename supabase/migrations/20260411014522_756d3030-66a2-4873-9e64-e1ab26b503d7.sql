
-- ============================================================
-- SEO Task Engine — Phase 1 Foundation Tables
-- ============================================================

-- 1. Enums (skip if already created from failed migration)
DO $$ BEGIN CREATE TYPE public.seo_object_type AS ENUM (
  'location', 'service', 'location_service', 'stylist_page',
  'website_page', 'gbp_listing', 'review_stream', 'competitor'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.seo_health_domain AS ENUM (
  'review', 'page', 'local_presence', 'content', 'competitive_gap', 'conversion'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.seo_task_status AS ENUM (
  'detected', 'queued', 'assigned', 'in_progress',
  'awaiting_dependency', 'awaiting_verification',
  'completed', 'overdue', 'escalated', 'suppressed', 'canceled'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.seo_campaign_status AS ENUM (
  'planning', 'active', 'blocked', 'at_risk', 'completed', 'abandoned'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.seo_dependency_type AS ENUM ('hard', 'soft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.seo_completion_method AS ENUM ('system', 'manual_approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.seo_impact_window AS ENUM ('7d', '30d', '90d');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. seo_objects
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seo_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  object_type public.seo_object_type NOT NULL,
  object_key TEXT NOT NULL,
  label TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, object_type, object_key)
);

ALTER TABLE public.seo_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seo_objects"
  ON public.seo_objects FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create seo_objects"
  ON public.seo_objects FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update seo_objects"
  ON public.seo_objects FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete seo_objects"
  ON public.seo_objects FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_seo_objects_org ON public.seo_objects(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_objects_type ON public.seo_objects(organization_id, object_type);

CREATE TRIGGER update_seo_objects_updated_at
  BEFORE UPDATE ON public.seo_objects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. seo_health_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seo_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  seo_object_id UUID NOT NULL REFERENCES public.seo_objects(id) ON DELETE CASCADE,
  domain public.seo_health_domain NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  raw_signals JSONB DEFAULT '{}'::jsonb,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seo_health_scores"
  ON public.seo_health_scores FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage seo_health_scores"
  ON public.seo_health_scores FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_seo_health_scores_obj ON public.seo_health_scores(seo_object_id, domain);
CREATE INDEX IF NOT EXISTS idx_seo_health_scores_org ON public.seo_health_scores(organization_id);

-- ============================================================
-- 4. seo_opportunity_risk_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seo_opportunity_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  service_id UUID,
  opportunity_score INTEGER NOT NULL CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  factors JSONB DEFAULT '{}'::jsonb,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_opportunity_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seo_opportunity_risk_scores"
  ON public.seo_opportunity_risk_scores FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage seo_opportunity_risk_scores"
  ON public.seo_opportunity_risk_scores FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_seo_opp_risk_org ON public.seo_opportunity_risk_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_opp_risk_loc_svc ON public.seo_opportunity_risk_scores(location_id, service_id);

-- ============================================================
-- 5. seo_task_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seo_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description_template TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL,
  trigger_domain public.seo_health_domain,
  trigger_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  assignment_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  due_date_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  completion_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  recurrence_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  dependency_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  suppression_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_impact_category TEXT,
  priority_weight_overrides JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view seo_task_templates"
  ON public.seo_task_templates FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Platform users can insert seo_task_templates"
  ON public.seo_task_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform users can update seo_task_templates"
  ON public.seo_task_templates FOR UPDATE
  TO authenticated
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform users can delete seo_task_templates"
  ON public.seo_task_templates FOR DELETE
  TO authenticated
  USING (public.is_platform_user(auth.uid()));

CREATE TRIGGER update_seo_task_templates_updated_at
  BEFORE UPDATE ON public.seo_task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. seo_campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seo_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  objective TEXT,
  status public.seo_campaign_status NOT NULL DEFAULT 'planning',
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_metrics JSONB DEFAULT '{}'::jsonb,
  window_start DATE,
  window_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seo_campaigns"
  ON public.seo_campaigns FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create seo_campaigns"
  ON public.seo_campaigns FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can update seo_campaigns"
  ON public.seo_campaigns FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete seo_campaigns"
  ON public.seo_campaigns FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_seo_campaigns_org ON public.seo_campaigns(organization_id);

CREATE TRIGGER update_seo_campaigns_updated_at
  BEFORE UPDATE ON public.seo_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. seo_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  template_key TEXT NOT NULL REFERENCES public.seo_task_templates(template_key) ON DELETE RESTRICT,
  primary_seo_object_id UUID NOT NULL REFERENCES public.seo_objects(id) ON DELETE CASCADE,
  secondary_seo_object_id UUID REFERENCES public.seo_objects(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_role TEXT,
  assigned_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  priority_score INTEGER NOT NULL DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
  priority_factors JSONB DEFAULT '{}'::jsonb,
  status public.seo_task_status NOT NULL DEFAULT 'detected',
  escalation_level INTEGER NOT NULL DEFAULT 0,
  proof_artifacts JSONB DEFAULT '[]'::jsonb,
  completion_verified_at TIMESTAMPTZ,
  completion_method public.seo_completion_method,
  suppression_reason TEXT,
  cooldown_until TIMESTAMPTZ,
  campaign_id UUID REFERENCES public.seo_campaigns(id) ON DELETE SET NULL,
  ai_generated_content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.seo_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seo_tasks"
  ON public.seo_tasks FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can create seo_tasks"
  ON public.seo_tasks FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Assigned or admin can update seo_tasks"
  ON public.seo_tasks FOR UPDATE
  USING (auth.uid() = assigned_to OR public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (auth.uid() = assigned_to OR public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can delete seo_tasks"
  ON public.seo_tasks FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_seo_tasks_org ON public.seo_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_tasks_status ON public.seo_tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_seo_tasks_assigned ON public.seo_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seo_tasks_campaign ON public.seo_tasks(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seo_tasks_primary_obj ON public.seo_tasks(primary_seo_object_id);
CREATE INDEX IF NOT EXISTS idx_seo_tasks_template ON public.seo_tasks(template_key);

CREATE TRIGGER update_seo_tasks_updated_at
  BEFORE UPDATE ON public.seo_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8. seo_task_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seo_task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.seo_tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status public.seo_task_status,
  new_status public.seo_task_status,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seo_task_history"
  ON public.seo_task_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.seo_tasks t WHERE t.id = task_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));
CREATE POLICY "Org members can insert seo_task_history"
  ON public.seo_task_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.seo_tasks t WHERE t.id = task_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_seo_task_history_task ON public.seo_task_history(task_id);

-- ============================================================
-- 9. seo_task_dependencies
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seo_task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.seo_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.seo_tasks(id) ON DELETE CASCADE,
  dependency_type public.seo_dependency_type NOT NULL DEFAULT 'hard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

ALTER TABLE public.seo_task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seo_task_dependencies"
  ON public.seo_task_dependencies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.seo_tasks t WHERE t.id = task_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));
CREATE POLICY "Org admins can manage seo_task_dependencies"
  ON public.seo_task_dependencies FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.seo_tasks t WHERE t.id = task_id
    AND public.is_org_admin(auth.uid(), t.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_seo_task_deps_task ON public.seo_task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_seo_task_deps_depends ON public.seo_task_dependencies(depends_on_task_id);

-- ============================================================
-- 10. seo_task_impact
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seo_task_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.seo_tasks(id) ON DELETE CASCADE,
  measurement_window public.seo_impact_window NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  contribution_confidence NUMERIC(4,3) CHECK (contribution_confidence >= 0 AND contribution_confidence <= 1),
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, measurement_window)
);

ALTER TABLE public.seo_task_impact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seo_task_impact"
  ON public.seo_task_impact FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.seo_tasks t WHERE t.id = task_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));
CREATE POLICY "Org admins can manage seo_task_impact"
  ON public.seo_task_impact FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.seo_tasks t WHERE t.id = task_id
    AND public.is_org_admin(auth.uid(), t.organization_id)
  ));

CREATE INDEX IF NOT EXISTS idx_seo_task_impact_task ON public.seo_task_impact(task_id);
