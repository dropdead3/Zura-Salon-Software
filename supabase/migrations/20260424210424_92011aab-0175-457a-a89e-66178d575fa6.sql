-- S7h backfill: populate phorest_branch_id + location_id on phorest_clients
-- so the existing org-scoped RLS policy can resolve them.

-- Step 1: derive phorest_branch_id from any mirrored appointment for the client.
UPDATE public.phorest_clients pc
SET phorest_branch_id = sub.phorest_branch_id
FROM (
  SELECT DISTINCT ON (phorest_client_id)
    phorest_client_id,
    phorest_branch_id
  FROM public.phorest_appointments
  WHERE phorest_client_id IS NOT NULL
    AND phorest_branch_id IS NOT NULL
  ORDER BY phorest_client_id, appointment_date DESC NULLS LAST
) sub
WHERE pc.phorest_client_id = sub.phorest_client_id
  AND pc.phorest_branch_id IS NULL;

-- Step 2: derive location_id from the locations table via phorest_branch_id.
UPDATE public.phorest_clients pc
SET location_id = l.id
FROM public.locations l
WHERE l.phorest_branch_id = pc.phorest_branch_id
  AND pc.location_id IS NULL;

-- Step 3: fallback — assign clients with no appointment history to the
-- organization's primary location so they remain visible. Without this,
-- contact-only imports stay invisible permanently. We pick the
-- alphabetically-first location with a phorest_branch_id mapping so the
-- assignment is deterministic and stable across reruns.
WITH primary_loc AS (
  SELECT id AS location_id, phorest_branch_id
  FROM public.locations
  WHERE phorest_branch_id IS NOT NULL
  ORDER BY name
  LIMIT 1
)
UPDATE public.phorest_clients pc
SET
  location_id = primary_loc.location_id,
  phorest_branch_id = COALESCE(pc.phorest_branch_id, primary_loc.phorest_branch_id)
FROM primary_loc
WHERE pc.location_id IS NULL;

-- Index to speed the locations join used by RLS on every directory query.
CREATE INDEX IF NOT EXISTS idx_phorest_clients_location_id
  ON public.phorest_clients(location_id);
