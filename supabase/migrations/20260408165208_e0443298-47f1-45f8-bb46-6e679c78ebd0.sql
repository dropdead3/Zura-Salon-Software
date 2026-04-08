
-- Union view: all appointments from both Phorest-synced and Zura-native tables
CREATE OR REPLACE VIEW public.v_all_appointments AS
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
  'phorest'::text AS source
FROM phorest_appointments pa
UNION ALL
SELECT
  a.id::text,
  a.location_id,
  a.staff_user_id AS stylist_user_id,
  a.phorest_staff_id,
  COALESCE(a.phorest_client_id, a.client_id::text) AS phorest_client_id,
  a.client_name,
  a.client_phone,
  a.service_name,
  a.service_category,
  a.appointment_date::text,
  a.start_time::text,
  a.end_time::text,
  a.status,
  a.total_price,
  a.tip_amount,
  NULL::numeric AS expected_price,
  a.rebooked_at_checkout,
  a.is_new_client,
  a.deleted_at::text,
  a.deleted_by::text,
  false AS is_demo,
  COALESCE(a.import_source, 'zura')::text AS source
FROM appointments a
WHERE a.import_source IS DISTINCT FROM 'phorest';

-- Union view: all clients from both Phorest-synced and Zura-native tables
CREATE OR REPLACE VIEW public.v_all_clients AS
SELECT
  pc.id::text AS id,
  pc.phorest_client_id,
  pc.name,
  pc.first_name,
  pc.last_name,
  pc.email,
  pc.email_normalized,
  pc.phone,
  pc.phone_normalized,
  pc.birthday::text AS birthday,
  pc.total_spend,
  pc.visit_count,
  pc.last_visit::text AS last_visit,
  pc.lead_source,
  COALESCE(pc.is_archived, false) AS is_archived,
  COALESCE(pc.is_duplicate, false) AS is_duplicate,
  pc.canonical_client_id::text AS canonical_client_id,
  pc.location_id,
  pc.created_at::text AS created_at,
  pc.client_since::text AS client_since,
  'phorest'::text AS source
FROM phorest_clients pc
UNION ALL
SELECT
  c.id::text,
  COALESCE(c.phorest_client_id, c.external_id, c.id::text) AS phorest_client_id,
  COALESCE(NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''), 'Unknown') AS name,
  c.first_name,
  c.last_name,
  c.email,
  c.email_normalized,
  c.mobile AS phone,
  c.phone_normalized,
  c.birthday::text,
  c.total_spend,
  c.visit_count,
  c.last_visit_date::text AS last_visit,
  c.lead_source,
  COALESCE(c.is_archived, false),
  false AS is_duplicate,
  NULL::text AS canonical_client_id,
  c.location_id,
  c.created_at::text,
  c.client_since::text,
  COALESCE(c.import_source, 'zura')::text AS source
FROM clients c
WHERE c.phorest_client_id IS NULL
  AND COALESCE(c.is_placeholder, false) = false;
