
DROP FUNCTION IF EXISTS public.validate_dock_pin(text);

CREATE FUNCTION public.validate_dock_pin(_pin text)
RETURNS TABLE(user_id uuid, display_name text, photo_url text, location_id text, organization_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ep.user_id,
    COALESCE(ep.display_name, ep.full_name) as display_name,
    ep.photo_url,
    ep.location_id,
    ep.organization_id
  FROM public.employee_profiles ep
  WHERE ep.login_pin = _pin
    AND ep.is_active = true
    AND ep.is_approved = true
  LIMIT 1
$$;
