
CREATE OR REPLACE FUNCTION public.sync_platform_logos_to_business_settings(
  _logo_dark_url text,
  _logo_light_url text,
  _icon_dark_url text,
  _icon_light_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_platform_role(auth.uid(), 'platform_owner') OR
    has_platform_role(auth.uid(), 'platform_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE business_settings
  SET logo_dark_url = _logo_dark_url,
      logo_light_url = _logo_light_url,
      icon_dark_url = _icon_dark_url,
      icon_light_url = _icon_light_url,
      updated_at = now();
END;
$$;
