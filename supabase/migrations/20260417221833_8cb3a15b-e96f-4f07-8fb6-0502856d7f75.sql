-- Track which week interval the client accepted when rebooking at checkout
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS rebooked_at_weeks INTEGER;

-- Index supports aggregation queries: median accepted interval per org per service category
CREATE INDEX IF NOT EXISTS idx_appointments_rebook_interval
  ON public.appointments(organization_id, service_category, rebooked_at_weeks)
  WHERE rebooked_at_weeks IS NOT NULL;