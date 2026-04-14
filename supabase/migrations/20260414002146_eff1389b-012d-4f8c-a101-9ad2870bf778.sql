-- Add per-location legal entity fields for multi-LLC support
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS ein TEXT;