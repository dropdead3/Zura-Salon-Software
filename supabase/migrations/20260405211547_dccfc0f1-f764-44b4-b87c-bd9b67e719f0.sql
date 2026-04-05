
-- Add utilization columns to level_promotion_criteria
ALTER TABLE public.level_promotion_criteria
  ADD COLUMN IF NOT EXISTS utilization_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS utilization_threshold NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utilization_weight INTEGER NOT NULL DEFAULT 0;

-- Add utilization columns to level_retention_criteria
ALTER TABLE public.level_retention_criteria
  ADD COLUMN IF NOT EXISTS utilization_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS utilization_minimum NUMERIC NOT NULL DEFAULT 0;
