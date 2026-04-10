

# Audit Pass — Final Gaps & Enhancements

## Issues Found

### 1. Hardcoded legacy paths — `window.location.href = '/dashboard/...'` (Bug)
Multiple files use `window.location.href = '/dashboard/...'` which bypasses the org-slug routing (`/org/:slug/dashboard/...`). These will trigger the `LegacyDashboardRedirect` fallback, causing a full page reload and unnecessary redirect hop. Affected files:
- `ColorBarSubscription.tsx` → `/dashboard/admin/color-bar-settings`
- `SalesDashboard.tsx` → `/dashboard/admin/phorest-settings` (×2)
- `MyProfile.tsx` → `/dashboard/onboarding`
- `WebsiteSettingsContent.tsx` → `/dashboard/admin/website-hub`
- `SettingsCategoryDetail.tsx` → `/dashboard/admin/program-editor`

All should use `dashPath()` with React Router `navigate()` instead.

### 2. Hardcoded legacy paths — `to="/dashboard/..."` Link props (Bug)
Two files use hardcoded `/dashboard/...` in `<Link to>` props:
- `AnalyticsHub.tsx` → `to="/dashboard/admin/reports"`
- `ReportsHub.tsx` → `backTo="/dashboard/admin/analytics"`

These bypass org-slug routing and should use `dashPath()`.

### 3. AppsMarketplace still imports `useOrganizationApps` (Dead code)
Line 23 imports `useOrganizationApps` and line 350 calls it, but `hasApp` is no longer used after the previous refactor. The `appsLoading` feeds into the combined `isLoading` unnecessarily — all three app statuses already have their own loading states. This is a wasted network request.

---

## Proposed Changes

| File | Change |
|------|--------|
| `src/pages/dashboard/admin/ColorBarSubscription.tsx` | Replace `window.location.href` with `navigate(dashPath(...))` |
| `src/pages/dashboard/admin/SalesDashboard.tsx` | Replace 2× `window.location.href` with `navigate(dashPath(...))` |
| `src/pages/dashboard/MyProfile.tsx` | Replace `window.location.href` with `navigate(dashPath(...))` |
| `src/components/dashboard/settings/WebsiteSettingsContent.tsx` | Replace `window.location.href` with `navigate(dashPath(...))` |
| `src/components/dashboard/settings/SettingsCategoryDetail.tsx` | Replace `window.location.href` with `navigate(dashPath(...))` |
| `src/pages/dashboard/admin/AnalyticsHub.tsx` | Replace hardcoded `to="/dashboard/admin/reports"` with `dashPath('/admin/reports')` |
| `src/pages/dashboard/admin/ReportsHub.tsx` | Replace hardcoded `backTo="/dashboard/admin/analytics"` with `dashPath('/admin/analytics')` |
| `src/pages/dashboard/AppsMarketplace.tsx` | Remove unused `useOrganizationApps` import and call; remove `appsLoading` from combined loading state |

### Detail: window.location.href replacements
Each file needs `useNavigate` from react-router and `useOrgDashboardPath` (if not already imported). Replace:
```tsx
window.location.href = '/dashboard/admin/color-bar-settings'
```
With:
```tsx
navigate(dashPath('/admin/color-bar-settings'))
```
This preserves org-slug context and avoids full page reloads.

### Detail: AppsMarketplace cleanup
Remove line 23 (`import { useOrganizationApps }`) and line 350 (`const { isLoading: appsLoading } = useOrganizationApps()`). Update the `isLoading` computation to only use the three entitlement loading states:
```tsx
const isLoading = connectLoading || payrollLoading || colorBarLoading;
```

