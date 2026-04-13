ALTER TABLE public.terminal_hardware_requests
  ADD COLUMN IF NOT EXISTS device_type TEXT NOT NULL DEFAULT 's710',
  ADD COLUMN IF NOT EXISTS accessories JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_total_cents INTEGER DEFAULT 0;