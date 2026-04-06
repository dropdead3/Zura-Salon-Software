
-- Drop the security definer view and replace with invoker view
DROP VIEW IF EXISTS public.products_public;

-- Recreate as SECURITY INVOKER (default, explicit for clarity)
CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = true)
AS
SELECT
  id, organization_id, location_id, name, description, brand, category, subcategory,
  sku, barcode, retail_price, size, container_size, image_url,
  is_active, available_online, product_type,
  variant, swatch_color, color_type, created_at
FROM public.products
WHERE is_active = true AND available_online = true;

GRANT SELECT ON public.products_public TO anon, authenticated;

-- Re-add the RLS policy for anon access via the view (view uses invoker RLS)
-- The view filters to active+online only, and the anon role needs a policy on products
CREATE POLICY "Public can view online products via view"
  ON public.products FOR SELECT TO anon
  USING (is_active = true AND available_online = true);
