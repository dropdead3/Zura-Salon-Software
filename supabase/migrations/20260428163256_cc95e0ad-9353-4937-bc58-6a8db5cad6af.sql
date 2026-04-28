UPDATE public.dashboard_element_visibility
SET element_name = 'Locations Status'
WHERE element_key = 'locations_rollup'
  AND element_name <> 'Locations Status';