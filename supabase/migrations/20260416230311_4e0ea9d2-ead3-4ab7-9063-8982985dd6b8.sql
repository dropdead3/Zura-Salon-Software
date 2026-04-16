CREATE OR REPLACE VIEW public.v_calendar_stylists AS
SELECT DISTINCT ON (v.user_id, v.location_id)
  v.user_id,
  v.phorest_staff_id,
  v.phorest_staff_name,
  v.display_name,
  v.full_name,
  v.photo_url,
  v.is_active,
  v.show_on_calendar,
  v.location_id,
  v.source
FROM public.v_all_staff v
WHERE v.user_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v.user_id
      AND ur.role IN ('stylist', 'stylist_assistant')
  )
ORDER BY v.user_id, v.location_id, v.phorest_staff_id NULLS LAST;

GRANT SELECT ON public.v_calendar_stylists TO authenticated, anon;