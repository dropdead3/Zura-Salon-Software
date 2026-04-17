-- Aggregate Color Bar entitlement counts (Performance: drops payload from O(locations × orgs) to O(orgs))
CREATE OR REPLACE FUNCTION public.get_color_bar_entitlement_counts()
RETURNS TABLE (
  organization_id uuid,
  total_count int,
  active_count int,
  suspended_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: platform users only';
  END IF;

  RETURN QUERY
  SELECT
    e.organization_id,
    COUNT(*)::int AS total_count,
    COUNT(*) FILTER (WHERE e.status = 'active')::int AS active_count,
    COUNT(*) FILTER (WHERE e.status = 'suspended')::int AS suspended_count
  FROM public.backroom_location_entitlements e
  GROUP BY e.organization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_color_bar_entitlement_counts() TO authenticated;