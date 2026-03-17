
-- Add wholesale pricing columns to supply_library_products
ALTER TABLE public.supply_library_products
  ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC,
  ADD COLUMN IF NOT EXISTS recommended_retail NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS price_source_id UUID REFERENCES public.wholesale_price_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;

-- Index for price source lookups
CREATE INDEX IF NOT EXISTS idx_supply_library_products_price_source
  ON public.supply_library_products(price_source_id);
