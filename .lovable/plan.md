

# Fix: Platform Logo Cross-Pollination into Organization Dashboards

## Problem

When a platform admin updates platform branding logos, the `sync_platform_logos_to_business_settings` RPC function **overwrites** the logo columns in the shared `business_settings` table. Since the org dashboard sidebar (`DashboardLayout`, `SidebarNavContent`, `DashboardLockScreen`) reads logos from `business_settings`, any platform logo change immediately replaces the organization's own uploaded logos.

There is only **one row** in `business_settings` — it has no `organization_id` scoping. It's a global singleton being used by both platform and org contexts.

## Root Cause — Two Vectors

1. **`sync_platform_logos_to_business_settings` RPC**: Called in `usePlatformBranding.ts` on every platform branding save. Directly overwrites `logo_dark_url`, `logo_light_url`, `icon_dark_url`, `icon_light_url` in `business_settings`.

2. **`set_default_org_logo` trigger**: Copies platform logo to `organizations.logo_url` on new org creation. This is acceptable as a *default* but contributes to the blurred boundary.

## Fix Plan

### 1. Remove the sync RPC call from `usePlatformBranding.ts`
- Delete the `supabase.rpc('sync_platform_logos_to_business_settings', ...)` call (lines 94-100)
- Delete the corresponding `onSuccess` cache update that overwrites `business-settings` query data with platform values (lines 108-117)
- Platform branding stays in `site_settings` where it belongs; `business_settings` logos become org-owned only

### 2. Drop the `sync_platform_logos_to_business_settings` database function
- Migration to drop the function since it should never be called — it's the primary cross-pollination vector

### 3. Ensure org dashboard logo resolution is independent
- The org dashboard already reads from `business_settings` via `useBusinessSettings()` — this is fine as long as platform saves stop overwriting it
- The `BusinessSettingsDialog` already lets org admins upload their own logos to `business_settings` — no change needed there
- Verify `DashboardLayout`, `SidebarNavContent`, `DashboardLockScreen` continue to work (they will, since `business_settings` data is untouched — just no longer overwritten)

### 4. Platform sidebar logo resolution
- The platform layout (`PlatformLayout` / platform sidebar) should read logos from `site_settings.platform_branding` via `usePlatformBranding()` — need to verify this is already the case and not falling back to `business_settings`

### Files to modify
- `src/hooks/usePlatformBranding.ts` — remove sync RPC call and business-settings cache override
- New migration SQL — `DROP FUNCTION IF EXISTS public.sync_platform_logos_to_business_settings`

### What stays the same
- `business_settings` logo columns remain — they're the org's own branding store
- `BusinessSettingsDialog` logo upload continues to work
- `set_default_org_logo` trigger on `organizations` stays (it's a one-time default on org creation, not an ongoing sync)
- All org dashboard logo resolution logic unchanged

