
CREATE OR REPLACE FUNCTION public.get_supply_library_brand_summaries()
RETURNS TABLE(brand text, category text, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT brand, category, count(*) as cnt
  FROM public.supply_library_products
  WHERE is_active = true
  GROUP BY brand, category
  ORDER BY brand, category
$$;
