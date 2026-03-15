
-- 1. Add charge_type, product_charge_markup_pct, product_wholesale_cost to checkout_usage_charges
ALTER TABLE public.checkout_usage_charges
ADD COLUMN IF NOT EXISTS charge_type TEXT NOT NULL DEFAULT 'overage',
ADD COLUMN IF NOT EXISTS product_charge_markup_pct NUMERIC,
ADD COLUMN IF NOT EXISTS product_wholesale_cost NUMERIC;

-- 2. Create backroom_billing_settings table
CREATE TABLE IF NOT EXISTS public.backroom_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  default_product_markup_pct NUMERIC NOT NULL DEFAULT 0,
  product_charge_taxable BOOLEAN NOT NULL DEFAULT true,
  product_charge_label TEXT NOT NULL DEFAULT 'Product Usage',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.backroom_billing_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view billing settings"
  ON public.backroom_billing_settings FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create billing settings"
  ON public.backroom_billing_settings FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update billing settings"
  ON public.backroom_billing_settings FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_backroom_billing_settings_updated_at
  BEFORE UPDATE ON public.backroom_billing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_backroom_billing_settings_org
  ON public.backroom_billing_settings(organization_id);

-- Index on charge_type for checkout_usage_charges
CREATE INDEX IF NOT EXISTS idx_checkout_usage_charges_charge_type
  ON public.checkout_usage_charges(charge_type);
