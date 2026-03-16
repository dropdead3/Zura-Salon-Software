

# Fix: Logo Sync to Business Settings Failing Due to RLS

## Root Cause

The `business_settings` table UPDATE RLS policy only allows users with:
- `has_role(auth.uid(), 'admin')` (app_role enum)
- `is_super_admin = true` on `employee_profiles`

Platform users have `platform_owner`/`platform_admin` roles (stored in `platform_roles` table), which don't satisfy either condition. The sync update in `usePlatformBranding` silently fails — no error is thrown because Supabase returns 0 rows affected without erroring.

**Proof from DB:**
- `site_settings.platform_branding` has new logo URLs (timestamps ~1769810xxx)
- `business_settings` still has old logo URLs (timestamps ~1769120xxx)

## Solution

Create a `SECURITY DEFINER` database function that syncs logo URLs from platform branding to business_settings, bypassing RLS. This is the correct approach because:
1. The sync is an internal platform operation, not a user-facing action
2. It avoids weakening the `business_settings` RLS policy for org-level admins
3. Platform owners already proved authorization by passing the `site_settings` RLS check

### 1. Database migration

Create function `sync_platform_logos_to_business_settings`:

```sql
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
  -- Only allow platform owners/admins
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
```

### 2. Update `usePlatformBranding.ts`

Replace the direct `business_settings` update with an RPC call:

```ts
await supabase.rpc('sync_platform_logos_to_business_settings', {
  _logo_dark_url: branding.primary_logo_url,
  _logo_light_url: branding.secondary_logo_url,
  _icon_dark_url: branding.icon_dark_url,
  _icon_light_url: branding.icon_light_url,
});
```

Remove the `select('id')` + manual update block (~10 lines replaced with a single RPC call).

### Files changed

| File | Change |
|------|--------|
| New migration SQL | `sync_platform_logos_to_business_settings` SECURITY DEFINER function |
| `src/hooks/usePlatformBranding.ts` | Replace direct update with `.rpc()` call |

