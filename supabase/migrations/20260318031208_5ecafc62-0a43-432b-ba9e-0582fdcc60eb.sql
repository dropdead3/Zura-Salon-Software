
-- Audit log for inventory setting changes (min/max/par_level/reorder_level)
CREATE TABLE IF NOT EXISTS public.inventory_settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  location_id TEXT,
  field_name TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_settings_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inventory settings audit"
  ON public.inventory_settings_audit FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert inventory settings audit"
  ON public.inventory_settings_audit FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_inventory_settings_audit_product
  ON public.inventory_settings_audit(organization_id, product_id);

CREATE INDEX idx_inventory_settings_audit_created
  ON public.inventory_settings_audit(created_at DESC);
