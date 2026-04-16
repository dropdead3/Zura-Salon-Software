-- 1. Archive flag on phorest_appointments to protect legacy data after detach
ALTER TABLE public.phorest_appointments
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_phorest_appointments_is_archived
  ON public.phorest_appointments(is_archived) WHERE is_archived = true;

-- 2. Trigger blocking DELETE on archived rows (prevents accidental purge of historical data)
CREATE OR REPLACE FUNCTION public.prevent_archived_appointment_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_archived = true THEN
    RAISE EXCEPTION 'Cannot delete archived appointment (id=%). Archived rows are preserved for historical reporting.', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_archived_appointment_delete ON public.phorest_appointments;
CREATE TRIGGER trg_prevent_archived_appointment_delete
  BEFORE DELETE ON public.phorest_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_archived_appointment_delete();

-- 3. Backfill staff_schedule_blocks: resolve user_id from phorest_staff_id
UPDATE public.staff_schedule_blocks ssb
SET user_id = psm.user_id
FROM public.phorest_staff_mapping psm
WHERE ssb.user_id IS NULL
  AND ssb.phorest_staff_id IS NOT NULL
  AND psm.phorest_staff_id = ssb.phorest_staff_id
  AND psm.user_id IS NOT NULL;

-- 4. Backfill staff_schedule_blocks: resolve location_id from phorest_branch_id
-- (location_id may currently store the branch id directly; map it to the canonical location uuid)
UPDATE public.staff_schedule_blocks ssb
SET location_id = loc.id
FROM public.locations loc
WHERE ssb.location_id IS NOT NULL
  AND loc.phorest_branch_id IS NOT NULL
  AND ssb.location_id = loc.phorest_branch_id
  AND ssb.location_id <> loc.id;