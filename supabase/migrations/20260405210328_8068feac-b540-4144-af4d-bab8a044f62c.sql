
-- Add retention rate + new clients columns to level_promotion_criteria
ALTER TABLE public.level_promotion_criteria
  ADD COLUMN IF NOT EXISTS retention_rate_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_rate_threshold NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retention_rate_weight INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_clients_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_clients_threshold NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_clients_weight INTEGER NOT NULL DEFAULT 0;

-- Add retention rate + new clients columns to level_retention_criteria
ALTER TABLE public.level_retention_criteria
  ADD COLUMN IF NOT EXISTS retention_rate_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_rate_minimum NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_clients_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_clients_minimum NUMERIC NOT NULL DEFAULT 0;
