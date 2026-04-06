-- 1. Add missing chat-attachments SELECT policy
CREATE POLICY "Authenticated users can view chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');

-- 2. Fix products cost_price exposure
DROP POLICY IF EXISTS "Public can view online products via view" ON public.products;

-- Drop and recreate the view without cost fields
DROP VIEW IF EXISTS public.products_public;
CREATE VIEW public.products_public AS
SELECT
  id, organization_id, name, description, category, brand, sku,
  retail_price, quantity_on_hand, reorder_level,
  is_active, available_online, image_url, product_type,
  created_at, updated_at
FROM public.products
WHERE is_active = true AND available_online = true;

GRANT SELECT ON public.products_public TO anon;

-- Authenticated product SELECT
CREATE POLICY "Authenticated users can view active products"
  ON public.products FOR SELECT TO authenticated
  USING (is_active = true);