ALTER TABLE public.phorest_appointments
  ADD COLUMN IF NOT EXISTS rebook_declined_reason TEXT;