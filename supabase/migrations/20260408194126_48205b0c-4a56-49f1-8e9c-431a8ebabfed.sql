
-- Add data_profile column to existing organization_health_scores
ALTER TABLE public.organization_health_scores
  ADD COLUMN IF NOT EXISTS data_profile JSONB DEFAULT '{}'::jsonb;

-- Create location_health_scores table
CREATE TABLE IF NOT EXISTS public.location_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'critical',
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  trends JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  data_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_id, score_date)
);

ALTER TABLE public.location_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view location health scores"
  ON public.location_health_scores FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Platform users can manage location health scores"
  ON public.location_health_scores FOR ALL
  USING (public.is_platform_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_location_health_scores_org
  ON public.location_health_scores(organization_id);

CREATE INDEX IF NOT EXISTS idx_location_health_scores_location_date
  ON public.location_health_scores(location_id, score_date DESC);

-- Create health_score_weights table
CREATE TABLE IF NOT EXISTS public.health_score_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  base_weight NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  requires_data_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_score_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read health score weights"
  ON public.health_score_weights FOR SELECT
  USING (true);

CREATE POLICY "Platform users can manage health score weights"
  ON public.health_score_weights FOR ALL
  USING (public.is_platform_user(auth.uid()));

CREATE TRIGGER update_health_score_weights_updated_at
  BEFORE UPDATE ON public.health_score_weights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default weights
INSERT INTO public.health_score_weights (category, base_weight, is_active, description, requires_data_source) VALUES
  ('revenue', 0.20, true, 'Revenue growth, avg ticket, revenue per stylist', NULL),
  ('client', 0.15, true, 'New client acquisition, active client trend', NULL),
  ('retention', 0.15, true, 'Rebooking rate, client retention, at-risk clients', NULL),
  ('utilization', 0.15, true, 'Capacity utilization, gap hours, daily bookings', NULL),
  ('team_performance', 0.10, true, 'Revenue per stylist variance, KPI attainment', NULL),
  ('operational_consistency', 0.10, true, 'No-show rate, cancellation rate, sync health', NULL),
  ('inventory_cost', 0.05, true, 'Waste %, reweigh compliance, stock days', 'hasInventory'),
  ('profitability', 0.10, false, 'Service margin, labor cost ratio', 'hasAccounting')
ON CONFLICT (category) DO NOTHING;
