-- =========================================================================
-- WAVE S5e: Sentinel Purge on phorest_appointments.client_name
-- =========================================================================
-- Pass 2/3 probes filter on `client_name IS NULL`, so any appointment row
-- carrying the legacy '[Deleted Client]' sentinel is invisible to the
-- backfill pipeline. Purge existing rows + add a structural constraint
-- mirroring the one on phorest_clients.

-- S5e-1: One-time data purge — NULL out sentinel-poisoned appointment rows
-- so they re-enter the missingNames query window on the next sync.
UPDATE public.phorest_appointments
SET client_name = NULL
WHERE client_name = '[Deleted Client]';

-- S5e-2: Structural enforcement gate — forbid the sentinel string at the
-- DB layer. Bug class S5 cannot recur on the appointments table.
ALTER TABLE public.phorest_appointments
  DROP CONSTRAINT IF EXISTS phorest_appointments_client_name_no_sentinel;

ALTER TABLE public.phorest_appointments
  ADD CONSTRAINT phorest_appointments_client_name_no_sentinel
  CHECK (client_name IS NULL OR client_name <> '[Deleted Client]');