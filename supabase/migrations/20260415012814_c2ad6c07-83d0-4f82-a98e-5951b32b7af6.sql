
DROP VIEW IF EXISTS public.v_all_clients;

CREATE VIEW public.v_all_clients AS

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
  pc.medical_alerts,
  pc.preferred_stylist_id,
  pc.notes,
  pc.is_vip,
  pc.is_banned,
  pc.ban_reason,
  pc.branch_name,
  pc.customer_number,
  pc.first_visit::text AS first_visit,
  'phorest'::text AS source
FROM phorest_clients pc

UNION ALL

SELECT
  c.id::text AS id,
  COALESCE(c.phorest_client_id, c.external_id, c.id::text) AS phorest_client_id,
  COALESCE(NULLIF(TRIM(BOTH FROM COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''), 'Unknown') AS name,
  c.first_name,
  c.last_name,
  c.email,
  c.email_normalized,
  c.mobile AS phone,
  c.phone_normalized,
  c.birthday::text AS birthday,
  c.total_spend,
  c.visit_count,
  c.last_visit_date::text AS last_visit,
  c.lead_source,
  COALESCE(c.is_archived, false) AS is_archived,
  false AS is_duplicate,
  NULL::text AS canonical_client_id,
  c.location_id,
  c.created_at::text AS created_at,
  c.client_since::text AS client_since,
  NULL::text AS medical_alerts,
  c.preferred_stylist_id,
  c.notes,
  COALESCE(c.is_vip, false) AS is_vip,
  false AS is_banned,
  NULL::text AS ban_reason,
  NULL::text AS branch_name,
  NULL::text AS customer_number,
  NULL::text AS first_visit,
  COALESCE(c.import_source, 'zura') AS source
FROM clients c
WHERE c.phorest_client_id IS NULL
  AND COALESCE(c.is_placeholder, false) = false;

GRANT SELECT ON public.v_all_clients TO anon, authenticated;
