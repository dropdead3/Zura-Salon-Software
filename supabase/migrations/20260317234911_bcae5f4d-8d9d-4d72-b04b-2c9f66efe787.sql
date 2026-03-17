
-- Create location_product_settings table (location_id is TEXT to match locations.id)
CREATE TABLE IF NOT EXISTS public.location_product_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_tracked BOOLEAN NOT NULL DEFAULT false,
  par_level NUMERIC NULL,
  reorder_level NUMERIC NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, product_id)
);

-- Enable RLS
ALTER TABLE public.location_product_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view location_product_settings"
  ON public.location_product_settings FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert location_product_settings"
  ON public.location_product_settings FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update location_product_settings"
  ON public.location_product_settings FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete location_product_settings"
  ON public.location_product_settings FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_location_product_settings_updated_at
  BEFORE UPDATE ON public.location_product_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_location_product_settings_org
  ON public.location_product_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_location_product_settings_location
  ON public.location_product_settings(location_id);
CREATE INDEX IF NOT EXISTS idx_location_product_settings_product
  ON public.location_product_settings(product_id);

-- Backfill: for every product with is_backroom_tracked=true, create settings rows for all active locations in that org
INSERT INTO public.location_product_settings (organization_id, location_id, product_id, is_tracked, par_level, reorder_level)
SELECT p.organization_id, l.id, p.id, true, p.par_level, p.reorder_level
FROM public.products p
INNER JOIN public.locations l ON l.organization_id = p.organization_id AND l.is_active = true
WHERE p.is_backroom_tracked = true AND p.is_active = true
ON CONFLICT (location_id, product_id) DO NOTHING;
