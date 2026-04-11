-- Drop the unique index and replace with a proper unique constraint for upsert support
DROP INDEX IF EXISTS idx_seo_object_revenue_unique;

ALTER TABLE public.seo_object_revenue
  ADD CONSTRAINT uq_seo_object_revenue_object_period
  UNIQUE (seo_object_id, period_start, period_end);