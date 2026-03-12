
-- 1a. backroom_analytics_snapshots
CREATE TABLE IF NOT EXISTS public.backroom_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  snapshot_date DATE NOT NULL,
  total_sessions INT DEFAULT 0,
  completed_sessions INT DEFAULT 0,
  avg_session_duration_minutes NUMERIC DEFAULT 0,
  total_product_cost NUMERIC DEFAULT 0,
  total_service_revenue NUMERIC DEFAULT 0,
  avg_chemical_cost_per_service NUMERIC DEFAULT 0,
  total_waste_qty NUMERIC DEFAULT 0,
  total_dispensed_qty NUMERIC DEFAULT 0,
  waste_pct NUMERIC DEFAULT 0,
  waste_by_category JSONB DEFAULT '{}',
  bowls_requiring_reweigh INT DEFAULT 0,
  bowls_reweighed INT DEFAULT 0,
  reweigh_compliance_pct NUMERIC DEFAULT 0,
  sessions_with_variance INT DEFAULT 0,
  total_overage_qty NUMERIC DEFAULT 0,
  total_underage_qty NUMERIC DEFAULT 0,
  theoretical_depletion NUMERIC DEFAULT 0,
  actual_depletion NUMERIC DEFAULT 0,
  ghost_loss_qty NUMERIC DEFAULT 0,
  ghost_loss_cost NUMERIC DEFAULT 0,
  staff_metrics JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, snapshot_date)
);

ALTER TABLE public.backroom_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view snapshots"
  ON public.backroom_analytics_snapshots FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert snapshots"
  ON public.backroom_analytics_snapshots FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update snapshots"
  ON public.backroom_analytics_snapshots FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_backroom_snapshots_org ON public.backroom_analytics_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_backroom_snapshots_date ON public.backroom_analytics_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_backroom_snapshots_location ON public.backroom_analytics_snapshots(location_id);

-- 1b. backroom_exceptions
CREATE TABLE IF NOT EXISTS public.backroom_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  staff_user_id UUID,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backroom_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view exceptions"
  ON public.backroom_exceptions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert exceptions"
  ON public.backroom_exceptions FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can update exceptions"
  ON public.backroom_exceptions FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_backroom_exceptions_org ON public.backroom_exceptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_backroom_exceptions_status ON public.backroom_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_backroom_exceptions_type ON public.backroom_exceptions(exception_type);
CREATE INDEX IF NOT EXISTS idx_backroom_exceptions_created ON public.backroom_exceptions(created_at);
