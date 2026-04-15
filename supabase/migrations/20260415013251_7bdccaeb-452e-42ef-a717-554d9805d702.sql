
DROP VIEW IF EXISTS public.v_all_staff;

CREATE VIEW public.v_all_staff AS

SELECT
  ep.user_id,
  psm.phorest_staff_id,
  psm.phorest_staff_name,
  COALESCE(ep.display_name, ep.full_name, psm.phorest_staff_name, 'Unknown') AS display_name,
  ep.full_name,
  ep.photo_url,
  COALESCE(ep.is_active, true) AS is_active,
  COALESCE(psm.show_on_calendar, true) AS show_on_calendar,
  ep.location_id,
  'phorest'::text AS source
FROM phorest_staff_mapping psm
LEFT JOIN employee_profiles ep ON ep.user_id = psm.user_id
WHERE psm.user_id IS NOT NULL

UNION ALL

SELECT
  ep.user_id,
  NULL::text AS phorest_staff_id,
  NULL::text AS phorest_staff_name,
  COALESCE(ep.display_name, ep.full_name, 'Unknown') AS display_name,
  ep.full_name,
  ep.photo_url,
  COALESCE(ep.is_active, true) AS is_active,
  true AS show_on_calendar,
  ep.location_id,
  'zura'::text AS source
FROM employee_profiles ep
WHERE NOT EXISTS (
  SELECT 1 FROM phorest_staff_mapping psm WHERE psm.user_id = ep.user_id
);

ALTER VIEW public.v_all_staff SET (security_invoker = true);
