
-- Create strategy state enum
CREATE TYPE public.seo_domination_strategy AS ENUM ('attack', 'expand', 'defend', 'abandon');

-- Create domination targets table
CREATE TABLE IF NOT EXISTS public.seo_domination_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  service_category TEXT NOT NULL,
  micro_market_keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_domination_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view domination targets"
  ON public.seo_domination_targets FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create domination targets"
  ON public.seo_domination_targets FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update domination targets"
  ON public.seo_domination_targets FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete domination targets"
  ON public.seo_domination_targets FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_seo_domination_targets_org
  ON public.seo_domination_targets(organization_id);

CREATE INDEX IF NOT EXISTS idx_seo_domination_targets_city_service
  ON public.seo_domination_targets(organization_id, city, service_category);

CREATE TRIGGER update_seo_domination_targets_updated_at
  BEFORE UPDATE ON public.seo_domination_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create domination scores table
CREATE TABLE IF NOT EXISTS public.seo_domination_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.seo_domination_targets(id) ON DELETE CASCADE,
  domination_score NUMERIC NOT NULL DEFAULT 0,
  review_dominance NUMERIC NOT NULL DEFAULT 0,
  content_dominance NUMERIC NOT NULL DEFAULT 0,
  page_strength NUMERIC NOT NULL DEFAULT 0,
  conversion_strength NUMERIC NOT NULL DEFAULT 0,
  competitor_suppression NUMERIC NOT NULL DEFAULT 0,
  visible_market_share NUMERIC NOT NULL DEFAULT 0,
  captured_revenue_share NUMERIC NOT NULL DEFAULT 0,
  strategy_state seo_domination_strategy NOT NULL DEFAULT 'attack',
  contributing_location_ids TEXT[] NOT NULL DEFAULT '{}',
  estimated_market_demand NUMERIC NOT NULL DEFAULT 0,
  factors JSONB DEFAULT '{}',
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_domination_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view domination scores"
  ON public.seo_domination_scores FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create domination scores"
  ON public.seo_domination_scores FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update domination scores"
  ON public.seo_domination_scores FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_seo_domination_scores_target
  ON public.seo_domination_scores(target_id);

CREATE INDEX IF NOT EXISTS idx_seo_domination_scores_org
  ON public.seo_domination_scores(organization_id);

CREATE INDEX IF NOT EXISTS idx_seo_domination_scores_scored_at
  ON public.seo_domination_scores(target_id, scored_at DESC);
