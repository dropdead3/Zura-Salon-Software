-- Add reschedule tracking columns to phorest_appointments
ALTER TABLE public.phorest_appointments
  ADD COLUMN IF NOT EXISTS rescheduled_from_date date,
  ADD COLUMN IF NOT EXISTS rescheduled_from_time time without time zone,
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz;