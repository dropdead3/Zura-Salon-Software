
-- Create inventory_alert_settings table
CREATE TABLE IF NOT EXISTS public.inventory_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  default_threshold_pct INT NOT NULL DEFAULT 100,
  alert_channels TEXT[] NOT NULL DEFAULT '{in_app,email}',
  recipient_user_ids UUID[] NOT NULL DEFAULT '{}',
  recipient_roles TEXT[] NOT NULL DEFAULT '{admin,manager}',
  auto_create_draft_po BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.inventory_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view alert settings"
  ON public.inventory_alert_settings FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert alert settings"
  ON public.inventory_alert_settings FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update alert settings"
  ON public.inventory_alert_settings FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_inventory_alert_settings_updated_at
  BEFORE UPDATE ON public.inventory_alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_inventory_alert_settings_org
  ON public.inventory_alert_settings(organization_id);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_change INT NOT NULL,
  quantity_after INT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'manual_adjust',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Authenticated users can insert stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
  ON public.stock_movements(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_org
  ON public.stock_movements(organization_id);
