

# Fix: Platform Logo Settings Not Reflected in Dashboard Sidebar

## Problem

The Platform Settings > Appearance tab saves logos to `site_settings` (via `usePlatformBranding`), but the dashboard sidebar reads logos from `business_settings` (via `useBusinessSettings`). These are two completely separate data sources — uploading new logos in platform settings never updates the dashboard sidebar.

**Data flow gap:**
- Platform Appearance saves: `site_settings.platform_branding.primary_logo_url` / `secondary_logo_url` / `icon_dark_url` / `icon_light_url`
- Dashboard sidebar reads: `business_settings.logo_dark_url` / `logo_light_url` / `icon_dark_url` / `icon_light_url`

## Solution

Sync platform branding logos to `business_settings` when saving. This ensures the dashboard sidebar (and all other consumers of `useBusinessSettings` like DashboardLayout, DashboardLockScreen, kiosk, etc.) reflect the uploaded logos.

### 1. Update `usePlatformBranding` save mutation

After successfully writing to `site_settings`, also update `business_settings` with the mapped logo URLs:

| Platform Branding Key | Business Settings Column |
|---|---|
| `primary_logo_url` | `logo_dark_url` |
| `secondary_logo_url` | `logo_light_url` |
| `icon_dark_url` | `icon_dark_url` |
| `icon_light_url` | `icon_light_url` |

In the `mutationFn` of `usePlatformBranding.ts`, after the `site_settings` update succeeds, run a second update against `business_settings` with the four logo columns. On success, also invalidate the `['business-settings']` query key so the sidebar picks up changes immediately.

### 2. Files changed

| File | Change |
|---|---|
| `src/hooks/usePlatformBranding.ts` | Add `business_settings` sync in mutation + invalidate `business-settings` query |

Single file change — no UI components need modification since the sidebar already reads from `business_settings` correctly.

