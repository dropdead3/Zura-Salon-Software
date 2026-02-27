ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS avatar_zoom real DEFAULT 1,
  ADD COLUMN IF NOT EXISTS avatar_rotation smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_zoom real DEFAULT 1,
  ADD COLUMN IF NOT EXISTS card_rotation smallint DEFAULT 0;