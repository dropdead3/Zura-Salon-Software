ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS estimated_revenue_impact_cents integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL;