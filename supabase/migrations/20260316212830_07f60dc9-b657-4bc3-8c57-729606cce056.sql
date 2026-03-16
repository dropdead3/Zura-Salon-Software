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
DECLARE
  _settings_id uuid;
BEGIN
  IF NOT (
    has_platform_role(auth.uid(), 'platform_owner') OR
    has_platform_role(auth.uid(), 'platform_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id
  INTO _settings_id
  FROM public.business_settings
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
  LIMIT 1;

  IF _settings_id IS NULL THEN
    RAISE EXCEPTION 'business_settings row not found';
  END IF;

  UPDATE public.business_settings
  SET logo_dark_url = _logo_dark_url,
      logo_light_url = _logo_light_url,
      icon_dark_url = _icon_dark_url,
      icon_light_url = _icon_light_url,
      updated_at = now()
  WHERE id = _settings_id;
END;
$$;