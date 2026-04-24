ALTER TABLE public.appointment_service_assignments
  ADD COLUMN IF NOT EXISTS start_time_offset_minutes integer,
  ADD COLUMN IF NOT EXISTS duration_minutes_override integer,
  ADD COLUMN IF NOT EXISTS price_override numeric(10,2),
  ADD COLUMN IF NOT EXISTS requires_consultation boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.appointment_service_assignments.start_time_offset_minutes IS 'Minutes from appointment start_time for this service row. NULL = derived from cumulative duration of preceding services.';
COMMENT ON COLUMN public.appointment_service_assignments.duration_minutes_override IS 'Override service duration. NULL = inherit from phorest_services.duration_minutes.';
COMMENT ON COLUMN public.appointment_service_assignments.price_override IS 'Override service price. NULL = inherit from phorest_services.price.';
COMMENT ON COLUMN public.appointment_service_assignments.requires_consultation IS 'RQ flag — service requires consultation before performing.';