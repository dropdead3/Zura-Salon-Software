
-- Add soft-delete columns to phorest_appointments
ALTER TABLE public.phorest_appointments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Add soft-delete columns to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Index for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_phorest_appointments_deleted_at ON public.phorest_appointments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON public.appointments(deleted_at) WHERE deleted_at IS NULL;
