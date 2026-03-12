
-- =====================================================
-- BACKROOM SETTINGS CONFIGURATOR — Phase 1 Migration
-- =====================================================

-- 1. Extend products table with backroom columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_backroom_tracked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS depletion_method TEXT NOT NULL DEFAULT 'weighed',
  ADD COLUMN IF NOT EXISTS is_billable_to_client BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_overage_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_forecast_eligible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cost_per_gram NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS unit_of_measure TEXT NOT NULL DEFAULT 'g',
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS variant TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT;

-- 2. Extend services table with backroom columns
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_backroom_tracked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistant_prep_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smart_mix_assist_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS formula_memory_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS predictive_backroom_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS variance_threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 15.0;

-- 3. backroom_settings (org-level key-value with location overrides)
CREATE TABLE IF NOT EXISTS public.backroom_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, location_id, setting_key)
);

ALTER TABLE public.backroom_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view backroom_settings"
  ON public.backroom_settings FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert backroom_settings"
  ON public.backroom_settings FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update backroom_settings"
  ON public.backroom_settings FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete backroom_settings"
  ON public.backroom_settings FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_backroom_settings_org ON public.backroom_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_backroom_settings_key ON public.backroom_settings(organization_id, setting_key);

-- 4. service_tracking_components
CREATE TABLE IF NOT EXISTS public.service_tracking_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  component_role TEXT NOT NULL DEFAULT 'required',
  contributes_to_inventory BOOLEAN NOT NULL DEFAULT true,
  contributes_to_cost BOOLEAN NOT NULL DEFAULT true,
  contributes_to_billing BOOLEAN NOT NULL DEFAULT false,
  contributes_to_waste BOOLEAN NOT NULL DEFAULT true,
  contributes_to_forecast BOOLEAN NOT NULL DEFAULT true,
  estimated_quantity NUMERIC(10,2),
  unit TEXT NOT NULL DEFAULT 'g',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, service_id, product_id)
);

ALTER TABLE public.service_tracking_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view service_tracking_components"
  ON public.service_tracking_components FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert service_tracking_components"
  ON public.service_tracking_components FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update service_tracking_components"
  ON public.service_tracking_components FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete service_tracking_components"
  ON public.service_tracking_components FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_stc_org ON public.service_tracking_components(organization_id);
CREATE INDEX IF NOT EXISTS idx_stc_service ON public.service_tracking_components(service_id);

-- 5. allowance_buckets
CREATE TABLE IF NOT EXISTS public.allowance_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.service_allowance_policies(id) ON DELETE CASCADE,
  bucket_name TEXT NOT NULL,
  mapped_product_categories TEXT[] NOT NULL DEFAULT '{}',
  mapped_product_ids UUID[] NOT NULL DEFAULT '{}',
  included_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  included_unit TEXT NOT NULL DEFAULT 'g',
  overage_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  overage_rate_type TEXT NOT NULL DEFAULT 'per_unit',
  overage_cap NUMERIC(10,2),
  billing_label TEXT NOT NULL DEFAULT 'Additional Product Usage',
  is_taxable BOOLEAN NOT NULL DEFAULT false,
  requires_manager_override BOOLEAN NOT NULL DEFAULT false,
  min_charge_threshold NUMERIC(10,2) NOT NULL DEFAULT 0,
  rounding_rule TEXT NOT NULL DEFAULT 'nearest_cent',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.allowance_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view allowance_buckets"
  ON public.allowance_buckets FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert allowance_buckets"
  ON public.allowance_buckets FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update allowance_buckets"
  ON public.allowance_buckets FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete allowance_buckets"
  ON public.allowance_buckets FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_ab_org ON public.allowance_buckets(organization_id);
CREATE INDEX IF NOT EXISTS idx_ab_policy ON public.allowance_buckets(policy_id);

-- 6. backroom_alert_rules
CREATE TABLE IF NOT EXISTS public.backroom_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  threshold_value NUMERIC(10,2) NOT NULL,
  threshold_unit TEXT NOT NULL DEFAULT '%',
  severity TEXT NOT NULL DEFAULT 'warning',
  creates_exception BOOLEAN NOT NULL DEFAULT false,
  creates_task BOOLEAN NOT NULL DEFAULT false,
  notify_roles TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backroom_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view backroom_alert_rules"
  ON public.backroom_alert_rules FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert backroom_alert_rules"
  ON public.backroom_alert_rules FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update backroom_alert_rules"
  ON public.backroom_alert_rules FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete backroom_alert_rules"
  ON public.backroom_alert_rules FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_bar_org ON public.backroom_alert_rules(organization_id);

-- 7. backroom_pricing_display_rules
CREATE TABLE IF NOT EXISTS public.backroom_pricing_display_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  display_mode TEXT NOT NULL DEFAULT 'internal_only',
  line_item_label TEXT NOT NULL DEFAULT 'Additional Product Usage',
  show_usage_to_staff BOOLEAN NOT NULL DEFAULT true,
  show_usage_to_client BOOLEAN NOT NULL DEFAULT false,
  auto_insert_checkout BOOLEAN NOT NULL DEFAULT false,
  requires_manager_approval BOOLEAN NOT NULL DEFAULT false,
  allow_waive BOOLEAN NOT NULL DEFAULT true,
  allow_edit BOOLEAN NOT NULL DEFAULT false,
  apply_tax BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backroom_pricing_display_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view backroom_pricing_display_rules"
  ON public.backroom_pricing_display_rules FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert backroom_pricing_display_rules"
  ON public.backroom_pricing_display_rules FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update backroom_pricing_display_rules"
  ON public.backroom_pricing_display_rules FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete backroom_pricing_display_rules"
  ON public.backroom_pricing_display_rules FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_bpdr_org ON public.backroom_pricing_display_rules(organization_id);

-- Updated_at triggers for new tables
CREATE TRIGGER update_backroom_settings_updated_at
  BEFORE UPDATE ON public.backroom_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE TRIGGER update_stc_updated_at
  BEFORE UPDATE ON public.service_tracking_components
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE TRIGGER update_ab_updated_at
  BEFORE UPDATE ON public.allowance_buckets
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE TRIGGER update_bar_updated_at
  BEFORE UPDATE ON public.backroom_alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

CREATE TRIGGER update_bpdr_updated_at
  BEFORE UPDATE ON public.backroom_pricing_display_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();
