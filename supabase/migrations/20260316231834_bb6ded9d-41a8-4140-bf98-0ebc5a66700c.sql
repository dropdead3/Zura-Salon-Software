
CREATE OR REPLACE FUNCTION public.set_default_org_logo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _platform_logo text;
BEGIN
  IF NEW.logo_url IS NULL OR NEW.logo_url = '' THEN
    SELECT value->>'secondary_logo_url'
      INTO _platform_logo
      FROM public.site_settings
     WHERE id = 'platform_branding'
       AND organization_id IS NULL
     LIMIT 1;

    IF _platform_logo IS NOT NULL THEN
      NEW.logo_url := _platform_logo;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_default_org_logo
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_org_logo();
