-- One-shot nudge: bump updated_at on phorest_appointments rows that have a
-- phorest_client_id but no client_name. This doesn't change behavior on its
-- own, but it makes the rows easy to find for the next sync's Pass 1/Pass 2
-- backfill — which now uses the corrected extraction (?expand=client + all
-- candidate name paths) and the paginated client-list fallback.
--
-- SIGNAL PRESERVATION: leave NULLs as NULL — they will resolve naturally on
-- the next sync, and in the meantime render as "Client #ABCD" placeholders
-- which truthfully say "we know the ID; we can't resolve the name yet."
UPDATE public.phorest_appointments
SET updated_at = now()
WHERE client_name IS NULL
  AND phorest_client_id IS NOT NULL;