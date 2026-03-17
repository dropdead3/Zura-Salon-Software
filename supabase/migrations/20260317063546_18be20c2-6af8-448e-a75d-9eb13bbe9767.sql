-- Prevent duplicate products within the same organization (case-insensitive brand + name)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_org_brand_name_unique
  ON public.products (organization_id, lower(brand), lower(name))
  WHERE is_active = true;