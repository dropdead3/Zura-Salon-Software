
-- Create retail_product_settings table for per-location retail inventory tracking
CREATE TABLE IF NOT EXISTS public.retail_product_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_tracked BOOLEAN NOT NULL DEFAULT true,
  par_level NUMERIC DEFAULT NULL,
  reorder_level NUMERIC DEFAULT NULL,
  display_position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint per org+location+product
ALTER TABLE public.retail_product_settings
  ADD CONSTRAINT uq_retail_product_settings_loc_product UNIQUE (organization_id, location_id, product_id);

-- Enable RLS
ALTER TABLE public.retail_product_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view retail product settings"
  ON public.retail_product_settings FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert retail product settings"
  ON public.retail_product_settings FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update retail product settings"
  ON public.retail_product_settings FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can delete retail product settings"
  ON public.retail_product_settings FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_retail_product_settings_updated_at
  BEFORE UPDATE ON public.retail_product_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retail_product_settings_org
  ON public.retail_product_settings(organization_id);

CREATE INDEX IF NOT EXISTS idx_retail_product_settings_loc
  ON public.retail_product_settings(organization_id, location_id);
