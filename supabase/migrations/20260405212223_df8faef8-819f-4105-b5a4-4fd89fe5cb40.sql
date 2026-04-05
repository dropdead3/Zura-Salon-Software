
-- Add rev_per_hour columns to level_promotion_criteria
ALTER TABLE public.level_promotion_criteria
  ADD COLUMN IF NOT EXISTS rev_per_hour_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rev_per_hour_threshold NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rev_per_hour_weight INTEGER NOT NULL DEFAULT 0;

-- Add rev_per_hour columns to level_retention_criteria
ALTER TABLE public.level_retention_criteria
  ADD COLUMN IF NOT EXISTS rev_per_hour_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rev_per_hour_minimum NUMERIC NOT NULL DEFAULT 0;
