
-- ============================================================
-- 1. Extend expansion_opportunities
-- ============================================================
ALTER TABLE public.expansion_opportunities
  ADD COLUMN IF NOT EXISTS service_id UUID,
  ADD COLUMN IF NOT EXISTS campaign_id UUID,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS predicted_revenue_lift_low NUMERIC,
  ADD COLUMN IF NOT EXISTS predicted_revenue_lift_high NUMERIC,
  ADD COLUMN IF NOT EXISTS predicted_booking_lift_low NUMERIC,
  ADD COLUMN IF NOT EXISTS predicted_booking_lift_expected NUMERIC,
  ADD COLUMN IF NOT EXISTS predicted_booking_lift_high NUMERIC,
  ADD COLUMN IF NOT EXISTS break_even_months_low NUMERIC,
  ADD COLUMN IF NOT EXISTS break_even_months_high NUMERIC,
  ADD COLUMN IF NOT EXISTS momentum_score NUMERIC,
  ADD COLUMN IF NOT EXISTS business_value_score NUMERIC,
  ADD COLUMN IF NOT EXISTS effort_score NUMERIC,
  ADD COLUMN IF NOT EXISTS constraint_type TEXT,
  ADD COLUMN IF NOT EXISTS eligibility_status TEXT NOT NULL DEFAULT 'detected',
  ADD COLUMN IF NOT EXISTS stripe_offer_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_offer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_offer_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS stripe_offer_terms_summary TEXT,
  ADD COLUMN IF NOT EXISTS recommended_action_label TEXT NOT NULL DEFAULT 'Fund This',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ============================================================
-- 2. Extend financed_projects
-- ============================================================
ALTER TABLE public.financed_projects
  ADD COLUMN IF NOT EXISTS funding_source TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS estimated_total_repayment NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_total_repayment_to_date NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_monthly_payment NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_monthly_payment NUMERIC,
  ADD COLUMN IF NOT EXISTS revenue_generated_to_date NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS predicted_revenue_to_date NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roi_to_date NUMERIC,
  ADD COLUMN IF NOT EXISTS break_even_progress_percent NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- ============================================================
-- 3. capital_offer_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.capital_offer_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.expansion_opportunities(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_offer_id TEXT,
  eligible BOOLEAN NOT NULL DEFAULT false,
  offered_amount NUMERIC,
  term_length INTEGER,
  repayment_model TEXT,
  estimated_payment_amount NUMERIC,
  fees_summary TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  raw_snapshot_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_offer_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view capital offer snapshots"
  ON public.capital_offer_snapshots FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert capital offer snapshots"
  ON public.capital_offer_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update capital offer snapshots"
  ON public.capital_offer_snapshots FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX idx_capital_offer_snapshots_org ON public.capital_offer_snapshots(organization_id);
CREATE INDEX idx_capital_offer_snapshots_opportunity ON public.capital_offer_snapshots(opportunity_id);

-- ============================================================
-- 4. capital_event_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.capital_event_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  opportunity_id UUID REFERENCES public.expansion_opportunities(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  surface_area TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view capital event log"
  ON public.capital_event_log FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Authenticated users can insert own capital events"
  ON public.capital_event_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_capital_event_log_org ON public.capital_event_log(organization_id);
CREATE INDEX idx_capital_event_log_opportunity ON public.capital_event_log(opportunity_id);
CREATE INDEX idx_capital_event_log_type ON public.capital_event_log(event_type);
