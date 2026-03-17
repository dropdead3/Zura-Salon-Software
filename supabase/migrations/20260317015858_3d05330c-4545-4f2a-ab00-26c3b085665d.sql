
-- Add product_line column to supply_library_products
ALTER TABLE public.supply_library_products ADD COLUMN IF NOT EXISTS product_line TEXT;

-- Index for efficient grouping/filtering by product line
CREATE INDEX IF NOT EXISTS idx_supply_lib_product_line ON public.supply_library_products(product_line);
