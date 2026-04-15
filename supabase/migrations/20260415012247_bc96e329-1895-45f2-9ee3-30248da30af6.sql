
CREATE OR REPLACE VIEW public.v_all_services AS

SELECT
  s.id,
  s.name,
  s.category,
  s.duration_minutes,
  s.price,
  s.is_active,
  s.allow_same_day_booking,
  s.lead_time_days,
  s.same_day_restriction_reason,
  s.requires_qualification,
  s.container_types::text[] AS container_types,
  s.is_chemical_service,
  s.location_id,
  s.organization_id,
  s.external_id AS phorest_service_id,
  CAST(NULL AS text) AS phorest_branch_id,
  s.created_at,
  s.updated_at,
  'zura' AS _source
FROM public.services s
WHERE s.is_active = true
  AND (s.is_archived = false OR s.is_archived IS NULL)

UNION ALL

SELECT
  ps.id,
  ps.name,
  ps.category,
  ps.duration_minutes,
  ps.price,
  ps.is_active,
  ps.allow_same_day_booking,
  ps.lead_time_days,
  ps.same_day_restriction_reason,
  ps.requires_qualification,
  ps.container_types::text[] AS container_types,
  ps.is_chemical_service,
  CAST(NULL AS text) AS location_id,
  CAST(NULL AS uuid) AS organization_id,
  ps.phorest_service_id,
  ps.phorest_branch_id,
  ps.created_at,
  ps.updated_at,
  'phorest' AS _source
FROM public.phorest_services ps
WHERE ps.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.name = ps.name
      AND s.is_active = true
      AND (s.is_archived = false OR s.is_archived IS NULL)
  );

GRANT SELECT ON public.v_all_services TO anon, authenticated;
