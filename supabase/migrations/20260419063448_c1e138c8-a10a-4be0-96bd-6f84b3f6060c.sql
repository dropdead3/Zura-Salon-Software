-- Add form-gating fields to appointments table
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS forms_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forms_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forms_completed_at TIMESTAMPTZ;

-- Index for kiosk lookup of pending-form appointments
CREATE INDEX IF NOT EXISTS idx_appointments_forms_required_pending
  ON public.appointments(organization_id, appointment_date)
  WHERE forms_required = true AND forms_completed = false;