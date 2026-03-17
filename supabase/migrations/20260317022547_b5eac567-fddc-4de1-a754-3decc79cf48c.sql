
-- Create supply_library_brands table for brand metadata
CREATE TABLE IF NOT EXISTS public.supply_library_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  country_of_origin TEXT,
  default_category TEXT DEFAULT 'color',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT supply_library_brands_name_unique UNIQUE (name)
);

-- Enable RLS
ALTER TABLE public.supply_library_brands ENABLE ROW LEVEL SECURITY;

-- Platform users full CRUD
CREATE POLICY "Platform users can manage brands"
  ON public.supply_library_brands FOR ALL
  TO authenticated
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

-- Org members can read brands
CREATE POLICY "Authenticated users can view brands"
  ON public.supply_library_brands FOR SELECT
  TO authenticated
  USING (true);

-- Updated_at trigger
CREATE TRIGGER update_supply_library_brands_updated_at
  BEFORE UPDATE ON public.supply_library_brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add brand_id FK to supply_library_products
ALTER TABLE public.supply_library_products
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.supply_library_brands(id);

CREATE INDEX IF NOT EXISTS idx_supply_library_products_brand_id
  ON public.supply_library_products(brand_id);

-- Create brand-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for brand logos
CREATE POLICY "Brand logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-logos');

-- Platform users can upload brand logos
CREATE POLICY "Platform users can upload brand logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'brand-logos' AND public.is_platform_user(auth.uid()));

-- Platform users can delete brand logos
CREATE POLICY "Platform users can delete brand logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'brand-logos' AND public.is_platform_user(auth.uid()));
