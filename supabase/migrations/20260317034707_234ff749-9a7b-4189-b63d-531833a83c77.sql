
DROP FUNCTION IF EXISTS public.get_supply_library_brand_summaries();

CREATE OR REPLACE FUNCTION public.get_supply_library_brand_summaries()
RETURNS TABLE(brand text, category text, cnt bigint, missing_price bigint, missing_swatch bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT brand, category, count(*) as cnt,
    count(*) FILTER (WHERE wholesale_price IS NULL) as missing_price,
    count(*) FILTER (WHERE swatch_color IS NULL AND category IN ('color','toner')) as missing_swatch
  FROM public.supply_library_products
  WHERE is_active = true
  GROUP BY brand, category
  ORDER BY brand, category
$$;
