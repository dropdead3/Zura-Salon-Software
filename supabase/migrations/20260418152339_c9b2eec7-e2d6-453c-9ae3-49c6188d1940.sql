-- Backfill orphaned phorest_clients to Drop Dead Salons' primary location.
-- Root cause: sync-phorest-data writes location_id = NULL because Phorest's
-- /client endpoint is global. Phase 2's flip to security_invoker correctly
-- hid these from RLS. Single-org tenant — safe to assign to primary location.
UPDATE public.phorest_clients
SET location_id = (
  SELECT l.id FROM public.locations l
  WHERE l.organization_id = 'fa23cd95-decf-436a-adba-4561b0ecc14d'
  ORDER BY l.id ASC
  LIMIT 1
)
WHERE location_id IS NULL;