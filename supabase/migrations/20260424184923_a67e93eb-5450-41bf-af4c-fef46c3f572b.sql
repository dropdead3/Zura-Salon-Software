-- Add phorest_branch_id to phorest_appointments to enable per-branch reconciliation
-- and targeted client-name resolution in sync-phorest-data.
ALTER TABLE public.phorest_appointments
  ADD COLUMN IF NOT EXISTS phorest_branch_id text;

CREATE INDEX IF NOT EXISTS idx_phorest_appointments_branch_date
  ON public.phorest_appointments (phorest_branch_id, appointment_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_phorest_appointments_missing_name
  ON public.phorest_appointments (appointment_date, phorest_client_id)
  WHERE client_name IS NULL AND phorest_client_id IS NOT NULL AND deleted_at IS NULL;

-- Update upsert RPC to accept and persist phorest_branch_id while preserving the
-- existing COALESCE-based name/phone protection.
CREATE OR REPLACE FUNCTION public.upsert_phorest_appointments_preserve_names(p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.phorest_appointments AS pa (
    phorest_id, stylist_user_id, phorest_staff_id, location_id,
    phorest_client_id, client_name, client_phone,
    appointment_date, start_time, end_time,
    service_name, service_category, status, total_price, notes, is_new_client,
    phorest_branch_id
  )
  SELECT
    (r->>'phorest_id')::text,
    NULLIF(r->>'stylist_user_id','')::uuid,
    NULLIF(r->>'phorest_staff_id','')::text,
    NULLIF(r->>'location_id','')::text,
    NULLIF(r->>'phorest_client_id','')::text,
    NULLIF(r->>'client_name',''),
    NULLIF(r->>'client_phone',''),
    (r->>'appointment_date')::date,
    (r->>'start_time')::time,
    (r->>'end_time')::time,
    NULLIF(r->>'service_name',''),
    NULLIF(r->>'service_category',''),
    NULLIF(r->>'status',''),
    CASE WHEN r ? 'total_price' AND r->>'total_price' <> '' THEN (r->>'total_price')::numeric ELSE NULL END,
    NULLIF(r->>'notes',''),
    COALESCE((r->>'is_new_client')::boolean, false),
    NULLIF(r->>'phorest_branch_id','')::text
  FROM jsonb_array_elements(p_rows) AS r
  ON CONFLICT (phorest_id) DO UPDATE
    SET
      stylist_user_id   = EXCLUDED.stylist_user_id,
      phorest_staff_id  = EXCLUDED.phorest_staff_id,
      location_id       = EXCLUDED.location_id,
      phorest_client_id = EXCLUDED.phorest_client_id,
      client_name       = COALESCE(EXCLUDED.client_name, pa.client_name),
      client_phone      = COALESCE(EXCLUDED.client_phone, pa.client_phone),
      appointment_date  = EXCLUDED.appointment_date,
      start_time        = EXCLUDED.start_time,
      end_time          = EXCLUDED.end_time,
      service_name      = EXCLUDED.service_name,
      service_category  = EXCLUDED.service_category,
      status            = EXCLUDED.status,
      total_price       = EXCLUDED.total_price,
      notes             = EXCLUDED.notes,
      is_new_client     = EXCLUDED.is_new_client,
      phorest_branch_id = COALESCE(EXCLUDED.phorest_branch_id, pa.phorest_branch_id),
      updated_at        = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- Reconciliation RPC: soft-delete active Phorest-mirrored appointments in a
-- branch+date window that were NOT returned in the latest fetch. Bounded to
-- the sync window and a specific branch to prevent false deletions when
-- another branch fetch is in flight.
CREATE OR REPLACE FUNCTION public.reconcile_phorest_appointments(
  p_branch_id text,
  p_date_from date,
  p_date_to date,
  p_seen_phorest_ids text[]
)
RETURNS TABLE(soft_deleted_count integer, sample_ids text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ids text[];
BEGIN
  IF p_branch_id IS NULL OR p_date_from IS NULL OR p_date_to IS NULL THEN
    soft_deleted_count := 0;
    sample_ids := ARRAY[]::text[];
    RETURN NEXT;
    RETURN;
  END IF;

  WITH stale AS (
    SELECT id, phorest_id
    FROM public.phorest_appointments
    WHERE phorest_branch_id = p_branch_id
      AND appointment_date BETWEEN p_date_from AND p_date_to
      AND deleted_at IS NULL
      AND NOT (phorest_id = ANY(COALESCE(p_seen_phorest_ids, ARRAY[]::text[])))
  ),
  upd AS (
    UPDATE public.phorest_appointments pa
       SET deleted_at = now(),
           updated_at = now()
      FROM stale s
     WHERE pa.id = s.id
    RETURNING pa.phorest_id
  )
  SELECT array_agg(phorest_id) INTO v_ids FROM upd;

  soft_deleted_count := COALESCE(array_length(v_ids, 1), 0);
  sample_ids := COALESCE(v_ids[1:10], ARRAY[]::text[]);
  RETURN NEXT;
END;
$$;