
-- Create enums
CREATE TYPE public.expansion_opportunity_type AS ENUM ('location_expansion', 'new_location', 'category_expansion', 'acquisition');
CREATE TYPE public.expansion_status AS ENUM ('identified', 'evaluating', 'approved', 'in_progress', 'completed', 'dismissed');

-- Create salon_performance_index table
CREATE TABLE IF NOT EXISTS public.salon_performance_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE CASCADE,
  spi_score NUMERIC NOT NULL DEFAULT 0,
  revenue_efficiency NUMERIC NOT NULL DEFAULT 0,
  growth_velocity NUMERIC NOT NULL DEFAULT 0,
  conversion_strength NUMERIC NOT NULL DEFAULT 0,
  pricing_power NUMERIC NOT NULL DEFAULT 0,
  operational_stability NUMERIC NOT NULL DEFAULT 0,
  execution_quality NUMERIC NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'moderate',
  factors JSONB DEFAULT '{}',
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salon_performance_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view SPI"
  ON public.salon_performance_index FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_spi_org ON public.salon_performance_index(organization_id);
CREATE INDEX IF NOT EXISTS idx_spi_location ON public.salon_performance_index(organization_id, location_id);

-- Create expansion_opportunities table
CREATE TABLE IF NOT EXISTS public.expansion_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  opportunity_type expansion_opportunity_type NOT NULL DEFAULT 'location_expansion',
  title TEXT NOT NULL,
  description TEXT,
  city TEXT,
  service_category TEXT,
  capital_required NUMERIC NOT NULL DEFAULT 0,
  predicted_annual_lift NUMERIC NOT NULL DEFAULT 0,
  roe_score NUMERIC NOT NULL DEFAULT 0,
  break_even_months NUMERIC,
  confidence TEXT NOT NULL DEFAULT 'medium',
  risk_factors JSONB DEFAULT '{}',
  spi_at_creation NUMERIC,
  status expansion_status NOT NULL DEFAULT 'identified',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expansion_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view opportunities"
  ON public.expansion_opportunities FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create opportunities"
  ON public.expansion_opportunities FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update opportunities"
  ON public.expansion_opportunities FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete opportunities"
  ON public.expansion_opportunities FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_expansion_opp_org ON public.expansion_opportunities(organization_id);

-- Create expansion_scenarios table
CREATE TABLE IF NOT EXISTS public.expansion_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.expansion_opportunities(id) ON DELETE CASCADE,
  investment_amount NUMERIC NOT NULL DEFAULT 0,
  projected_monthly_lift NUMERIC NOT NULL DEFAULT 0,
  break_even_months NUMERIC,
  confidence TEXT NOT NULL DEFAULT 'medium',
  assumptions JSONB DEFAULT '{}',
  result_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.expansion_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view scenarios"
  ON public.expansion_scenarios FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create scenarios"
  ON public.expansion_scenarios FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete scenarios"
  ON public.expansion_scenarios FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_expansion_scenarios_org ON public.expansion_scenarios(organization_id);
CREATE INDEX IF NOT EXISTS idx_expansion_scenarios_opp ON public.expansion_scenarios(opportunity_id);
