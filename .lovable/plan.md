

# Audit Pass — Remaining Gaps, Bugs & Enhancements

## Issues Found

### 1. Stylist Mixing Dashboard has no Color Bar entitlement gate (Bug — direct URL bypass)
`/mixing` route (`StylistMixingDashboard.tsx`) renders Color Bar mixing data without checking `useColorBarEntitlement`. Any user who navigates directly to the URL sees the page. The route in `App.tsx` has no `requiredPermission` either — it's a bare `<ProtectedRoute>`.

### 2. Color Bar sidebar uses `organization_apps` table, not feature flags (Inconsistency)
The sidebar `APP_KEY_MAP` (line 573) gates the Color Bar link via `useOrganizationApps` (`organization_apps` table), while the TeamHub, ColorBarSettings page, and entitlement hook all use `organization_feature_flags` with key `backroom_enabled`. This means the sidebar could show/hide Color Bar based on a different source of truth than the rest of the system. The sidebar should use `useColorBarEntitlement` via the `ENTITLEMENT_GATES` pattern, consistent with Payroll and Connect.

### 3. Apps Marketplace Color Bar status uses `organization_apps`, not feature flags (Inconsistency)
`getActiveStatus` in `AppsMarketplace.tsx` calls `hasApp('backroom')` for Color Bar (line 358), which checks `organization_apps`. Payroll and Connect both use their entitlement hooks (feature flags). Color Bar should also use `useColorBarEntitlement` for a consistent active status.

### 4. PayrollCallback page has no entitlement gate (Minor — defense in depth)
`/admin/payroll/callback` has `requiredPermission="manage_payroll"` but no payroll entitlement check. If the org doesn't have payroll enabled, the callback page shouldn't process connections. Low severity since the callback requires valid OAuth params, but adding entitlement check is good defense in depth.

---

## Proposed Changes

| File | Change |
|------|--------|
| `src/pages/dashboard/StylistMixingDashboard.tsx` | Add `useColorBarEntitlement` check — redirect or show gate when org isn't entitled |
| `src/components/dashboard/SidebarNavContent.tsx` | Move Color Bar from `APP_KEY_MAP` / `organization_apps` check to `ENTITLEMENT_GATES` using `isColorBarEntitled` |
| `src/pages/dashboard/AppsMarketplace.tsx` | Import `useColorBarEntitlement`; use it in `getActiveStatus` for the `backroom` key instead of `hasApp` |
| `src/pages/dashboard/admin/PayrollCallback.tsx` | Add `usePayrollEntitlement` check — redirect to dashboard if org doesn't have payroll |

### Detail: StylistMixingDashboard gate
Import `useColorBarEntitlement` and `Navigate`. If not entitled and not loading, redirect to dashboard home. Show loader during entitlement check.

### Detail: Sidebar Color Bar unification
Remove `APP_KEY_MAP` block entirely. Add Color Bar to `ENTITLEMENT_GATES`:
```
{ hrefSuffix: '/admin/color-bar-settings', entitled: isColorBarEntitled }
```
Import `useColorBarEntitlement` in the sidebar (it's already imported in TeamHub so the pattern is established). Remove the now-unused `useOrganizationApps` import if no other references remain.

### Detail: AppsMarketplace Color Bar status
Import `useColorBarEntitlement`. In `getActiveStatus`, check `colorBarActive` for key `backroom` instead of `hasApp(key)`. Remove `useOrganizationApps` if no longer needed.

### Detail: PayrollCallback gate
Add entitlement check at the top — if not entitled, redirect to dashboard home.

