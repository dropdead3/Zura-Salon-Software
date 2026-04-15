-- Recreate v_all_appointments with additional operational columns
DROP VIEW IF EXISTS public.v_all_appointments;

CREATE OR REPLACE VIEW public.v_all_appointments AS
SELECT
  pa.id::text AS id,
  pa.location_id,
  pa.stylist_user_id,
  pa.phorest_staff_id,
  pa.phorest_client_id,
  COALESCE(
    pa.client_name,
    pc.name,
    NULLIF(TRIM(COALESCE(pc.first_name, '') || ' ' || COALESCE(pc.last_name, '')), '')
  ) AS client_name,
  pa.client_phone,
  pa.service_name,
  pa.service_category,
  pa.appointment_date::text AS appointment_date,
  pa.start_time::text AS start_time,
  pa.end_time::text AS end_time,
  pa.status,
  pa.total_price,
  pa.tip_amount,
  pa.expected_price,
  pa.rebooked_at_checkout,
  pa.is_new_client,
  pa.deleted_at::text AS deleted_at,
  pa.deleted_by::text AS deleted_by,
  COALESCE(pa.is_demo, false) AS is_demo,
  pa.is_walk_in,
  psm.phorest_staff_name AS staff_name,
  pa.payment_status,
  pa.payment_failure_reason,
  pa.payment_method,
  pa.original_price,
  pa.discount_amount,
  pa.notes,
  pa.is_redo,
  pa.redo_reason,
  EXTRACT(EPOCH FROM (pa.end_time - pa.start_time))::integer / 60 AS duration_minutes,
  NULL::uuid AS organization_id,
  pa.created_at::text AS created_at,
  'phorest'::text AS source
FROM phorest_appointments pa
LEFT JOIN phorest_staff_mapping psm ON psm.phorest_staff_id = pa.phorest_staff_id
LEFT JOIN phorest_clients pc ON pc.phorest_client_id = pa.phorest_client_id

UNION ALL

SELECT
  a.id::text AS id,
  a.location_id,
  a.staff_user_id AS stylist_user_id,
  a.phorest_staff_id,
  COALESCE(a.phorest_client_id, a.client_id::text) AS phorest_client_id,
  a.client_name,
  a.client_phone,
  a.service_name,
  a.service_category,
  a.appointment_date::text AS appointment_date,
  a.start_time::text AS start_time,
  a.end_time::text AS end_time,
  a.status,
  a.total_price,
  a.tip_amount,
  NULL::numeric AS expected_price,
  a.rebooked_at_checkout,
  a.is_new_client,
  a.deleted_at::text AS deleted_at,
  a.deleted_by::text AS deleted_by,
  false AS is_demo,
  false AS is_walk_in,
  a.staff_name,
  a.payment_status,
  a.payment_failure_reason,
  a.payment_method,
  a.original_price,
  NULL::numeric AS discount_amount,
  a.notes,
  a.is_redo,
  a.redo_reason,
  a.duration_minutes,
  a.organization_id,
  a.created_at::text AS created_at,
  COALESCE(a.import_source, 'zura'::text) AS source
FROM appointments a
WHERE a.import_source IS DISTINCT FROM 'phorest'::text;

ALTER VIEW public.v_all_appointments SET (security_invoker = true);