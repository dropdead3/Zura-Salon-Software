
ALTER TABLE public.backroom_stations
  ADD COLUMN IF NOT EXISTS connection_type TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS device_name TEXT,
  ADD COLUMN IF NOT EXISTS scale_model TEXT,
  ADD COLUMN IF NOT EXISTS pairing_code TEXT;
