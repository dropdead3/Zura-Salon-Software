

# Default New Organization Logos to Platform Logos

## Problem
When a new organization is created, its `logo_url` is empty, so dashboards show a generic icon instead of the platform's branding. The platform logos already exist in `site_settings` (row `id='platform_branding'`, `organization_id IS NULL`).

## Approach: Database Trigger

Create a `BEFORE INSERT` trigger on `public.organizations` that, when `logo_url` is NULL, reads the platform branding from `site_settings` and populates the new org's `logo_url` with the platform's `secondary_logo_url` (the light-mode full logo, which is the standard display logo).

### SQL Migration

```sql
CREATE OR REPLACE FUNCTION public.set_default_org_logo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _platform_logo text;
BEGIN
  -- Only set if logo_url is not already provided
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
```

### Why this approach
- **Zero frontend changes** — the trigger fires automatically at the DB level
- **SECURITY DEFINER** — allows reading the platform-level `site_settings` row regardless of RLS
- **Non-destructive** — only sets `logo_url` when it's NULL/empty; explicit logos are preserved
- **Single source of truth** — always pulls from the current platform branding, so if the platform logo changes, new orgs get the latest

