
-- Add composite index for the main backroom product catalog query
CREATE INDEX IF NOT EXISTS idx_products_org_active_type 
ON public.products (organization_id, is_active, product_type);
