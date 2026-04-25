-- Composite indexes to accelerate per-client visit history lookups.
-- The query pattern in useClientVisitHistory filters by phorest_client_id and
-- orders by appointment_date desc, start_time desc. A composite covering both
-- legs of the v_all_appointments UNION turns the per-client scan into an index
-- range read.
CREATE INDEX IF NOT EXISTS idx_phorest_appointments_client_date
  ON public.phorest_appointments (phorest_client_id, appointment_date DESC, start_time DESC)
  WHERE deleted_at IS NULL;

-- v_all_appointments coalesces appointments.phorest_client_id with appointments.client_id::text,
-- so most lookups against the Zura-native leg hit phorest_client_id first.
CREATE INDEX IF NOT EXISTS idx_appointments_phorest_client_date
  ON public.appointments (phorest_client_id, appointment_date DESC, start_time DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_client_date
  ON public.appointments (client_id, appointment_date DESC, start_time DESC)
  WHERE deleted_at IS NULL;