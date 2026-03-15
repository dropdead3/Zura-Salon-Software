
-- Create supply_library_products table
CREATE TABLE IF NOT EXISTS public.supply_library_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'color',
  default_depletion TEXT NOT NULL DEFAULT 'weighed',
  default_unit TEXT NOT NULL DEFAULT 'g',
  size_options TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supply_library_products ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage (CRUD)
CREATE POLICY "Platform users can manage supply library"
  ON public.supply_library_products FOR ALL
  USING (public.is_platform_user(auth.uid()));

-- All authenticated users can read (for browsing in catalog)
CREATE POLICY "Authenticated users can read supply library"
  ON public.supply_library_products FOR SELECT
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supply_library_brand ON public.supply_library_products(brand);
CREATE INDEX IF NOT EXISTS idx_supply_library_category ON public.supply_library_products(category);

-- Updated_at trigger
CREATE TRIGGER update_supply_library_products_updated_at
  BEFORE UPDATE ON public.supply_library_products
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();
