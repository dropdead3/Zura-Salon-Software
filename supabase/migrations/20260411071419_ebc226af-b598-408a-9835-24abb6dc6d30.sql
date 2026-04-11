
-- Enum for replenishment threshold types
CREATE TYPE public.replenishment_threshold_type AS ENUM ('days_of_stock', 'fixed_quantity', 'forecast_driven');

-- Enum for replenishment event statuses
CREATE TYPE public.replenishment_event_status AS ENUM ('suggested', 'approved', 'ordered', 'dismissed');

-- ──────────────────────────────────────────────
-- 1. supplier_preferences
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  auto_replenish_enabled BOOLEAN NOT NULL DEFAULT false,
  priority_rank INTEGER NOT NULL DEFAULT 0,
  fulfillment_api_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view supplier preferences"
  ON public.supplier_preferences FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create supplier preferences"
  ON public.supplier_preferences FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update supplier preferences"
  ON public.supplier_preferences FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete supplier preferences"
  ON public.supplier_preferences FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_supplier_preferences_org
  ON public.supplier_preferences(organization_id);

CREATE TRIGGER update_supplier_preferences_updated_at
  BEFORE UPDATE ON public.supplier_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ──────────────────────────────────────────────
-- 2. product_service_performance
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_service_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  total_uses INTEGER NOT NULL DEFAULT 0,
  avg_quantity_per_use NUMERIC NOT NULL DEFAULT 0,
  avg_service_revenue NUMERIC NOT NULL DEFAULT 0,
  avg_product_cost NUMERIC NOT NULL DEFAULT 0,
  margin_pct NUMERIC NOT NULL DEFAULT 0,
  outcome_score NUMERIC,
  last_used_at TIMESTAMPTZ,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_service_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view product service performance"
  ON public.product_service_performance FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_product_service_perf_org
  ON public.product_service_performance(organization_id);

CREATE INDEX IF NOT EXISTS idx_product_service_perf_product
  ON public.product_service_performance(product_id);

-- ──────────────────────────────────────────────
-- 3. auto_replenishment_rules
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auto_replenishment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  supplier_preference_id UUID REFERENCES public.supplier_preferences(id) ON DELETE SET NULL,
  threshold_type public.replenishment_threshold_type NOT NULL DEFAULT 'days_of_stock',
  threshold_value NUMERIC NOT NULL DEFAULT 7,
  max_order_value NUMERIC,
  require_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_replenishment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view replenishment rules"
  ON public.auto_replenishment_rules FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create replenishment rules"
  ON public.auto_replenishment_rules FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update replenishment rules"
  ON public.auto_replenishment_rules FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete replenishment rules"
  ON public.auto_replenishment_rules FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_auto_replenishment_rules_org
  ON public.auto_replenishment_rules(organization_id);

CREATE TRIGGER update_auto_replenishment_rules_updated_at
  BEFORE UPDATE ON public.auto_replenishment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ──────────────────────────────────────────────
-- 4. auto_replenishment_events
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auto_replenishment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  trigger_reason TEXT NOT NULL,
  recommended_qty NUMERIC NOT NULL DEFAULT 0,
  supplier_name TEXT NOT NULL,
  status public.replenishment_event_status NOT NULL DEFAULT 'suggested',
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_replenishment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view replenishment events"
  ON public.auto_replenishment_events FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create replenishment events"
  ON public.auto_replenishment_events FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update replenishment events"
  ON public.auto_replenishment_events FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete replenishment events"
  ON public.auto_replenishment_events FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_auto_replenishment_events_org
  ON public.auto_replenishment_events(organization_id);

CREATE INDEX IF NOT EXISTS idx_auto_replenishment_events_status
  ON public.auto_replenishment_events(status);
