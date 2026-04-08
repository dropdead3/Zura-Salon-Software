CREATE OR REPLACE VIEW public.v_all_appointments
WITH (security_invoker = true)
AS
SELECT
  pa.id::text AS id,
  pa.location_id,
  pa.stylist_user_id,
  pa.phorest_staff_id,
  pa.phorest_client_id,
  pa.client_name,
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
  psm.phorest_staff_name AS staff_name,
  'phorest'::text AS source
FROM phorest_appointments pa
LEFT JOIN phorest_staff_mapping psm ON psm.phorest_staff_id = pa.phorest_staff_id
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
  a.staff_name,
  COALESCE(a.import_source, 'zura'::text) AS source
FROM appointments a
WHERE a.import_source IS DISTINCT FROM 'phorest'::text;