
-- =====================================================
-- ZURA CAPITAL — PRODUCTION TABLES
-- =====================================================

-- 1. capital_funding_opportunities
CREATE TABLE IF NOT EXISTS public.capital_funding_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NULL,
  service_id UUID NULL,
  stylist_id UUID NULL,
  campaign_id UUID NULL,
  source_opportunity_id UUID NULL,
  source_opportunity_type TEXT NULL,
  opportunity_type TEXT NOT NULL,
  constraint_type TEXT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  recommended_action_label TEXT NOT NULL DEFAULT 'Fund This',
  required_investment_cents INTEGER NOT NULL,
  predicted_revenue_lift_low_cents INTEGER NOT NULL DEFAULT 0,
  predicted_revenue_lift_expected_cents INTEGER NOT NULL DEFAULT 0,
  predicted_revenue_lift_high_cents INTEGER NOT NULL DEFAULT 0,
  predicted_booking_lift_low NUMERIC(10,2) NOT NULL DEFAULT 0,
  predicted_booking_lift_expected NUMERIC(10,2) NOT NULL DEFAULT 0,
  predicted_booking_lift_high NUMERIC(10,2) NOT NULL DEFAULT 0,
  break_even_months_low NUMERIC(8,2) NOT NULL DEFAULT 0,
  break_even_months_expected NUMERIC(8,2) NOT NULL DEFAULT 0,
  break_even_months_high NUMERIC(8,2) NOT NULL DEFAULT 0,
  roe_score NUMERIC(8,2) NOT NULL DEFAULT 0,
  confidence_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  momentum_score INTEGER NULL,
  business_value_score INTEGER NULL,
  effort_score INTEGER NULL,
  operational_stability_score INTEGER NULL,
  stripe_offer_available BOOLEAN NOT NULL DEFAULT false,
  eligibility_status TEXT NOT NULL DEFAULT 'draft',
  surface_priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  reason_code TEXT NULL,
  reason_summary TEXT NULL,
  funding_provider TEXT NULL,
  provider_offer_id TEXT NULL,
  provider_offer_amount_cents INTEGER NULL,
  provider_offer_term_months INTEGER NULL,
  provider_estimated_payment_cents INTEGER NULL,
  provider_fees_summary TEXT NULL,
  coverage_ratio NUMERIC(8,4) NULL,
  net_monthly_gain_expected_cents INTEGER NULL,
  created_by_system BOOLEAN NOT NULL DEFAULT true,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  surfaced_at TIMESTAMPTZ NULL,
  viewed_at TIMESTAMPTZ NULL,
  initiated_at TIMESTAMPTZ NULL,
  funded_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_funding_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view capital opportunities"
  ON public.capital_funding_opportunities FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create capital opportunities"
  ON public.capital_funding_opportunities FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update capital opportunities"
  ON public.capital_funding_opportunities FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete capital opportunities"
  ON public.capital_funding_opportunities FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_cfo_org_status ON public.capital_funding_opportunities(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_cfo_org_priority ON public.capital_funding_opportunities(organization_id, surface_priority DESC);
CREATE INDEX IF NOT EXISTS idx_cfo_location_service ON public.capital_funding_opportunities(location_id, service_id, status);
CREATE INDEX IF NOT EXISTS idx_cfo_stylist ON public.capital_funding_opportunities(stylist_id, status);
CREATE INDEX IF NOT EXISTS idx_cfo_campaign ON public.capital_funding_opportunities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cfo_provider_offer ON public.capital_funding_opportunities(provider_offer_id);
CREATE INDEX IF NOT EXISTS idx_cfo_expires ON public.capital_funding_opportunities(expires_at);

CREATE TRIGGER update_capital_funding_opportunities_updated_at
  BEFORE UPDATE ON public.capital_funding_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. capital_provider_offers
CREATE TABLE IF NOT EXISTS public.capital_provider_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  funding_opportunity_id UUID NOT NULL REFERENCES public.capital_funding_opportunities(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_offer_id TEXT NOT NULL,
  eligible BOOLEAN NOT NULL DEFAULT false,
  offered_amount_cents INTEGER NULL,
  term_length_months INTEGER NULL,
  repayment_model TEXT NULL,
  estimated_payment_cents INTEGER NULL,
  estimated_total_repayment_cents INTEGER NULL,
  fees_summary TEXT NULL,
  apr_text TEXT NULL,
  raw_snapshot_json JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_provider_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view provider offers"
  ON public.capital_provider_offers FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can create provider offers"
  ON public.capital_provider_offers FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_cpo_opportunity ON public.capital_provider_offers(funding_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_cpo_org_provider ON public.capital_provider_offers(organization_id, provider);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cpo_provider_offer_id ON public.capital_provider_offers(provider_offer_id) WHERE provider_offer_id IS NOT NULL;

-- 3. capital_funding_projects
CREATE TABLE IF NOT EXISTS public.capital_funding_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  funding_opportunity_id UUID NOT NULL REFERENCES public.capital_funding_opportunities(id),
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_offer_id TEXT NULL,
  funded_amount_cents INTEGER NOT NULL,
  required_investment_cents INTEGER NOT NULL,
  coverage_ratio NUMERIC(8,4) NOT NULL DEFAULT 1.0,
  funding_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  repayment_status TEXT NOT NULL DEFAULT 'not_started',
  repayment_progress_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  estimated_total_repayment_cents INTEGER NULL,
  actual_total_repayment_to_date_cents INTEGER NOT NULL DEFAULT 0,
  expected_monthly_payment_cents INTEGER NULL,
  actual_monthly_payment_cents INTEGER NULL,
  revenue_generated_to_date_cents INTEGER NOT NULL DEFAULT 0,
  predicted_revenue_to_date_cents INTEGER NOT NULL DEFAULT 0,
  variance_percent NUMERIC(8,2) NULL,
  roi_to_date NUMERIC(10,4) NULL,
  break_even_progress_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  activation_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_funding_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view capital projects"
  ON public.capital_funding_projects FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create capital projects"
  ON public.capital_funding_projects FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update capital projects"
  ON public.capital_funding_projects FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_cfp_opportunity ON public.capital_funding_projects(funding_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_cfp_org_status ON public.capital_funding_projects(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_cfp_provider_offer ON public.capital_funding_projects(provider_offer_id);
CREATE INDEX IF NOT EXISTS idx_cfp_synced ON public.capital_funding_projects(last_synced_at);

CREATE TRIGGER update_capital_funding_projects_updated_at
  BEFORE UPDATE ON public.capital_funding_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. capital_surface_state
CREATE TABLE IF NOT EXISTS public.capital_surface_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  funding_opportunity_id UUID NOT NULL REFERENCES public.capital_funding_opportunities(id) ON DELETE CASCADE,
  surface_area TEXT NOT NULL,
  last_shown_at TIMESTAMPTZ NULL,
  show_count INTEGER NOT NULL DEFAULT 0,
  dismissed_at TIMESTAMPTZ NULL,
  dismiss_reason TEXT NULL,
  cooldown_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_surface_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view surface state"
  ON public.capital_surface_state FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage surface state"
  ON public.capital_surface_state FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update surface state"
  ON public.capital_surface_state FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_css_opp_surface ON public.capital_surface_state(funding_opportunity_id, surface_area);

CREATE TRIGGER update_capital_surface_state_updated_at
  BEFORE UPDATE ON public.capital_surface_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. capital_policy_settings
CREATE TABLE IF NOT EXISTS public.capital_policy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  roe_threshold NUMERIC(8,2) NOT NULL DEFAULT 1.8,
  confidence_threshold INTEGER NOT NULL DEFAULT 70,
  max_risk_level TEXT NOT NULL DEFAULT 'medium',
  max_concurrent_projects INTEGER NOT NULL DEFAULT 2,
  max_exposure_cents INTEGER NULL,
  cooldown_after_decline_days INTEGER NOT NULL DEFAULT 14,
  cooldown_after_underperformance_days INTEGER NOT NULL DEFAULT 30,
  allow_manager_initiation BOOLEAN NOT NULL DEFAULT false,
  allow_stylist_microfunding BOOLEAN NOT NULL DEFAULT false,
  stylist_spi_threshold INTEGER NOT NULL DEFAULT 80,
  stylist_ors_threshold INTEGER NOT NULL DEFAULT 85,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_policy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view policy settings"
  ON public.capital_policy_settings FOR SELECT
  USING (
    organization_id IS NULL
    OR public.is_org_admin(auth.uid(), organization_id)
  );

CREATE POLICY "Org admins can manage policy settings"
  ON public.capital_policy_settings FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update policy settings"
  ON public.capital_policy_settings FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_cps_org ON public.capital_policy_settings(organization_id) WHERE organization_id IS NOT NULL;

CREATE TRIGGER update_capital_policy_settings_updated_at
  BEFORE UPDATE ON public.capital_policy_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Also update capital_event_log to reference new tables
ALTER TABLE public.capital_event_log ADD COLUMN IF NOT EXISTS funding_project_id UUID NULL;
ALTER TABLE public.capital_event_log ADD COLUMN IF NOT EXISTS funding_opportunity_id UUID NULL;
CREATE INDEX IF NOT EXISTS idx_cel_funding_opp ON public.capital_event_log(funding_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_cel_funding_proj ON public.capital_event_log(funding_project_id);
