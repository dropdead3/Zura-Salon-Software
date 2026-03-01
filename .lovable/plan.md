

## Fix Broken Nav Links and Missing Label Rendering

### Issues Found

**1. Missing i18n keys for new hub labels**
The nav consolidation added `labelKey` values (`team_hub`, `client_hub`, `growth_hub`) to `dashboardNav.ts`, but never added the corresponding entries to `src/locales/en.json`. The `getNavLabel` function in `SidebarNavContent.tsx` calls `t('nav.team_hub')` etc., which returns the raw key string instead of a proper label.

**Fix:** Add `team_hub`, `client_hub`, and `growth_hub` to `en.json` under `dashboard.nav`.

**2. Missing routes in `VALID_ROUTE_PREFIXES` (guidanceRoutes.ts)**
The new hub routes (`/dashboard/admin/team-hub`, `/dashboard/admin/client-hub`, `/dashboard/admin/growth-hub`) and several other existing routes are missing from the valid route set. This causes AI-generated guidance links to these pages to be rejected as invalid.

**Fix:** Add the new hub routes plus other missing routes (`/dashboard/admin/access-hub`, `/dashboard/today-prep`, `/dashboard/waitlist`, `/dashboard/appointments-hub`, `/dashboard/campaigns`, `/dashboard/admin/feedback`, `/dashboard/admin/client-health`, `/dashboard/admin/reengagement`, `/dashboard/admin/seo-workshop`) to `VALID_ROUTE_PREFIXES`.

**3. `sectionItemsMap` uses legacy prop names**
In `SidebarNavContent.tsx`, the `myTools` section is built from `[...growthNavItems, ...statsNavItems]` (the legacy prop names). Since `dashboardNav.ts` now exports `myToolsNavItems` as the canonical list, the `DashboardLayout` should pass this directly. However, since the props still use the old names for backward compatibility, the current merge-and-deduplicate approach works but is fragile. No change needed now — it functions correctly.

### Files to Edit

| File | Change |
|---|---|
| `src/locales/en.json` | Add 3 missing nav keys: `team_hub`, `client_hub`, `growth_hub` |
| `src/utils/guidanceRoutes.ts` | Add ~12 missing route prefixes to `VALID_ROUTE_PREFIXES` |

### Impact
- Nav labels for Team Hub, Client Hub, and Growth Hub will render properly instead of showing raw i18n keys
- AI guidance links to hub pages will be recognized as valid routes

