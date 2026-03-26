ALTER TABLE public.service_allowance_policies
  ADD COLUMN IF NOT EXISTS allowance_health_status TEXT,
  ADD COLUMN IF NOT EXISTS allowance_health_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMPTZ;