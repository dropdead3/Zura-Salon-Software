-- Add card-specific focal point columns to employee_profiles
ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS card_focal_x SMALLINT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS card_focal_y SMALLINT DEFAULT 50;