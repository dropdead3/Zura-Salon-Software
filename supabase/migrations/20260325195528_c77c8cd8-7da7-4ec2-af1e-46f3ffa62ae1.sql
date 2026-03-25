ALTER TABLE public.services
  ALTER COLUMN variance_threshold_pct SET DEFAULT 10.0;

UPDATE public.services
  SET variance_threshold_pct = 10.0
  WHERE variance_threshold_pct = 15.0;