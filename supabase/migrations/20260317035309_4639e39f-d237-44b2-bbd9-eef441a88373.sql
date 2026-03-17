
-- Add is_professional column
ALTER TABLE public.supply_library_products
  ADD COLUMN IF NOT EXISTS is_professional BOOLEAN NOT NULL DEFAULT true;

-- Recreate brand summaries RPC with is_professional
CREATE OR REPLACE FUNCTION public.get_supply_library_brand_summaries()
RETURNS TABLE(brand text, category text, cnt bigint, missing_price bigint, missing_swatch bigint, is_professional boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    brand, 
    category, 
    count(*) as cnt,
    count(*) FILTER (WHERE wholesale_price IS NULL) as missing_price,
    count(*) FILTER (WHERE swatch_color IS NULL AND category IN ('color','toner')) as missing_swatch,
    bool_and(is_professional) as is_professional
  FROM supply_library_products 
  WHERE is_active = true
  GROUP BY brand, category 
  ORDER BY brand, category
$$;
