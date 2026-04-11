CREATE UNIQUE INDEX IF NOT EXISTS idx_product_service_performance_composite
  ON public.product_service_performance(organization_id, product_id, service_name, period_start, period_end);