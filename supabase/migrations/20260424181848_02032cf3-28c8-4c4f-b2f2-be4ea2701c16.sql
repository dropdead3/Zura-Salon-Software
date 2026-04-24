-- R6a-SQL: Coalescing upsert for phorest_appointments. Prevents the sync
-- from null-overwriting client_name/client_phone when the Phorest payload
-- omits them (which happens for the majority of appointments).
CREATE OR REPLACE FUNCTION public.upsert_phorest_appointments_preserve_names(
  p_rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.phorest_appointments AS pa (
    phorest_id,
    stylist_user_id,
    phorest_staff_id,
    location_id,
    phorest_client_id,
    client_name,
    client_phone,
    appointment_date,
    start_time,
    end_time,
    service_name,
    service_category,
    status,
    total_price,
    notes,
    is_new_client
  )
  SELECT
    (r->>'phorest_id')::text,
    NULLIF(r->>'stylist_user_id','')::uuid,
    NULLIF(r->>'phorest_staff_id','')::text,
    NULLIF(r->>'location_id','')::uuid,
    NULLIF(r->>'phorest_client_id','')::text,
    NULLIF(r->>'client_name',''),
    NULLIF(r->>'client_phone',''),
    (r->>'appointment_date')::date,
    (r->>'start_time')::timestamptz,
    (r->>'end_time')::timestamptz,
    NULLIF(r->>'service_name',''),
    NULLIF(r->>'service_category',''),
    NULLIF(r->>'status',''),
    CASE WHEN r ? 'total_price' AND r->>'total_price' <> '' THEN (r->>'total_price')::numeric ELSE NULL END,
    NULLIF(r->>'notes',''),
    COALESCE((r->>'is_new_client')::boolean, false)
  FROM jsonb_array_elements(p_rows) AS r
  ON CONFLICT (phorest_id) DO UPDATE
    SET
      stylist_user_id   = EXCLUDED.stylist_user_id,
      phorest_staff_id  = EXCLUDED.phorest_staff_id,
      location_id       = EXCLUDED.location_id,
      phorest_client_id = EXCLUDED.phorest_client_id,
      -- KEY DOCTRINE: only overwrite when incoming has a real value.
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
      updated_at        = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Service role + authenticated may invoke (edge function uses service role).
REVOKE ALL ON FUNCTION public.upsert_phorest_appointments_preserve_names(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_phorest_appointments_preserve_names(jsonb) TO service_role;