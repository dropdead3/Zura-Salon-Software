CREATE OR REPLACE VIEW public.v_all_staff AS
-- Phorest-mapped staff: explode location_ids[] so multi-location stylists appear at every location
SELECT
  ep.user_id,
  psm.phorest_staff_id,
  psm.phorest_staff_name,
  COALESCE(ep.display_name, ep.full_name, psm.phorest_staff_name, 'Unknown') AS display_name,
  ep.full_name,
  ep.photo_url,
  COALESCE(ep.is_active, true) AS is_active,
  COALESCE(psm.show_on_calendar, true) AS show_on_calendar,
  loc_id AS location_id,
  'phorest'::text AS source
FROM public.phorest_staff_mapping psm
LEFT JOIN public.employee_profiles ep ON ep.user_id = psm.user_id
CROSS JOIN LATERAL unnest(
  COALESCE(
    NULLIF(ep.location_ids, '{}'::text[]),
    ARRAY[ep.location_id]::text[]
  )
) AS loc_id
WHERE psm.user_id IS NOT NULL AND loc_id IS NOT NULL

UNION ALL

-- Zura-only staff (no Phorest mapping): same explosion
SELECT
  ep.user_id,
  NULL::text AS phorest_staff_id,
  NULL::text AS phorest_staff_name,
  COALESCE(ep.display_name, ep.full_name, 'Unknown') AS display_name,
  ep.full_name,
  ep.photo_url,
  COALESCE(ep.is_active, true) AS is_active,
  true AS show_on_calendar,
  loc_id AS location_id,
  'zura'::text AS source
FROM public.employee_profiles ep
CROSS JOIN LATERAL unnest(
  COALESCE(
    NULLIF(ep.location_ids, '{}'::text[]),
    ARRAY[ep.location_id]::text[]
  )
) AS loc_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.phorest_staff_mapping psm WHERE psm.user_id = ep.user_id
)
AND loc_id IS NOT NULL;