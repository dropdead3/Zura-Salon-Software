
-- ============================================================
-- 1. stylist_spi_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stylist_spi_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  location_id TEXT,
  spi_score NUMERIC NOT NULL DEFAULT 0,
  revenue_score NUMERIC NOT NULL DEFAULT 0,
  retention_score NUMERIC NOT NULL DEFAULT 0,
  rebooking_score NUMERIC NOT NULL DEFAULT 0,
  execution_score NUMERIC NOT NULL DEFAULT 0,
  growth_score NUMERIC NOT NULL DEFAULT 0,
  review_score NUMERIC NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'underperforming',
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stylist_spi_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view stylist SPI scores"
  ON public.stylist_spi_scores FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_stylist_spi_scores_org ON public.stylist_spi_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_stylist_spi_scores_user ON public.stylist_spi_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_stylist_spi_scores_scored_at ON public.stylist_spi_scores(scored_at DESC);

-- ============================================================
-- 2. stylist_ors_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stylist_ors_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ors_score NUMERIC NOT NULL DEFAULT 0,
  spi_average NUMERIC NOT NULL DEFAULT 0,
  consistency_score NUMERIC NOT NULL DEFAULT 0,
  leadership_score NUMERIC NOT NULL DEFAULT 0,
  demand_stability NUMERIC NOT NULL DEFAULT 0,
  career_stage TEXT NOT NULL DEFAULT 'stylist',
  financing_eligible BOOLEAN NOT NULL DEFAULT false,
  ownership_eligible BOOLEAN NOT NULL DEFAULT false,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stylist_ors_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stylists can view own ORS"
  ON public.stylist_ors_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can view all ORS"
  ON public.stylist_ors_scores FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_stylist_ors_org ON public.stylist_ors_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_stylist_ors_user ON public.stylist_ors_scores(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stylist_ors_unique ON public.stylist_ors_scores(organization_id, user_id);

CREATE TRIGGER update_stylist_ors_updated_at
  BEFORE UPDATE ON public.stylist_ors_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. stylist_career_milestones
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stylist_career_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  milestone_type TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  spi_at_milestone NUMERIC NOT NULL DEFAULT 0,
  ors_at_milestone NUMERIC,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stylist_career_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stylists can view own milestones"
  ON public.stylist_career_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can view all milestones"
  ON public.stylist_career_milestones FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_career_milestones_org ON public.stylist_career_milestones(organization_id);
CREATE INDEX IF NOT EXISTS idx_career_milestones_user ON public.stylist_career_milestones(user_id);

-- ============================================================
-- 4. Alter expansion_opportunities — add staff_user_id
-- ============================================================
ALTER TABLE public.expansion_opportunities
  ADD COLUMN IF NOT EXISTS staff_user_id UUID;

-- ============================================================
-- 5. Alter financed_projects — add staff_user_id, repayment_model, revenue_share_pct
-- ============================================================
ALTER TABLE public.financed_projects
  ADD COLUMN IF NOT EXISTS staff_user_id UUID,
  ADD COLUMN IF NOT EXISTS repayment_model TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS revenue_share_pct NUMERIC;
