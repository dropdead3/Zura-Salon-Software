ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS lead_pool_eligible boolean NOT NULL DEFAULT true;