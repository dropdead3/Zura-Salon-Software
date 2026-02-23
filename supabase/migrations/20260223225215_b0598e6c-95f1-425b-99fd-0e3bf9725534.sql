-- Add unique constraint on phorest_daily_sales_summary for upsert conflict target
ALTER TABLE public.phorest_daily_sales_summary
  DROP CONSTRAINT IF EXISTS phorest_daily_sales_summary_staff_location_date_key;

ALTER TABLE public.phorest_daily_sales_summary
  ADD CONSTRAINT phorest_daily_sales_summary_staff_location_date_key
  UNIQUE (phorest_staff_id, location_id, summary_date);