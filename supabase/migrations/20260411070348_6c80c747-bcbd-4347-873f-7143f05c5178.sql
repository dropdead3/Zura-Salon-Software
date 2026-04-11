
-- Enums for ownership layer
CREATE TYPE public.zos_eligibility AS ENUM ('prime', 'watchlist', 'ineligible');
CREATE TYPE public.network_deal_type AS ENUM ('revenue_share', 'equity_stake', 'full_acquisition');
CREATE TYPE public.network_pipeline_stage AS ENUM ('observe', 'qualify', 'offer', 'convert', 'scale');
CREATE TYPE public.capital_entry_type AS ENUM ('investment', 'return', 'reinvestment');

-- Network Ownership Scores
CREATE TABLE IF NOT EXISTS public.network_ownership_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  zos_score NUMERIC NOT NULL DEFAULT 0,
  spi_component NUMERIC NOT NULL DEFAULT 0,
  consistency_component NUMERIC NOT NULL DEFAULT 0,
  execution_reliability NUMERIC NOT NULL DEFAULT 0,
  growth_responsiveness NUMERIC NOT NULL DEFAULT 0,
  team_stability NUMERIC NOT NULL DEFAULT 0,
  market_position NUMERIC NOT NULL DEFAULT 0,
  eligibility_status zos_eligibility NOT NULL DEFAULT 'ineligible',
  hard_filter_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.network_ownership_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view ownership scores"
  ON public.network_ownership_scores FOR SELECT
  USING (public.is_platform_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_network_ownership_scores_org
  ON public.network_ownership_scores(organization_id);

CREATE INDEX IF NOT EXISTS idx_network_ownership_scores_eligibility
  ON public.network_ownership_scores(eligibility_status);

-- Network Deals
CREATE TABLE IF NOT EXISTS public.network_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_type network_deal_type NOT NULL,
  pipeline_stage network_pipeline_stage NOT NULL DEFAULT 'observe',
  terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  capital_deployed NUMERIC NOT NULL DEFAULT 0,
  total_return NUMERIC NOT NULL DEFAULT 0,
  roi_multiple NUMERIC NOT NULL DEFAULT 0,
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.network_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view deals"
  ON public.network_deals FOR SELECT
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform admins can create deals"
  ON public.network_deals FOR INSERT
  WITH CHECK (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform admins can update deals"
  ON public.network_deals FOR UPDATE
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform admins can delete deals"
  ON public.network_deals FOR DELETE
  USING (public.is_platform_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_network_deals_org
  ON public.network_deals(organization_id);

CREATE INDEX IF NOT EXISTS idx_network_deals_stage
  ON public.network_deals(pipeline_stage);

CREATE TRIGGER update_network_deals_updated_at
  BEFORE UPDATE ON public.network_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Network Capital Ledger
CREATE TABLE IF NOT EXISTS public.network_capital_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.network_deals(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_type capital_entry_type NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.network_capital_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view ledger"
  ON public.network_capital_ledger FOR SELECT
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform admins can create ledger entries"
  ON public.network_capital_ledger FOR INSERT
  WITH CHECK (public.is_platform_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_network_capital_ledger_deal
  ON public.network_capital_ledger(deal_id);

CREATE INDEX IF NOT EXISTS idx_network_capital_ledger_org
  ON public.network_capital_ledger(organization_id);
