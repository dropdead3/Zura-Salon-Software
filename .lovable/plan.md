

# Audit Pass — Remaining Gaps

## Issues Found

### 1. PricingAnalyticsContent uses `organization_apps` instead of feature flags (Inconsistency)
`PricingAnalyticsContent.tsx` still uses `useOrganizationApps` with `hasApp('backroom')` to gate pricing intelligence. This is the last remaining usage of the old `organization_apps` table for Color Bar gating. Should use `useColorBarEntitlement` for consistency.

### 2. Sidebar still imports `useOrganizationApps` but `activatedApps` is unused (Dead code)
After the sidebar refactor moved Color Bar to `ENTITLEMENT_GATES`, the `activatedApps` variable from `useOrganizationApps` is no longer referenced anywhere in the sidebar. The import and call are dead code — an unnecessary network request on every sidebar render.

### 3. ColorBarSubscription page has no entitlement gate (Minor — direct URL bypass)
`/admin/color-bar-subscription` only checks `requiredPermission="manage_settings"` at the route level. It has no Color Bar entitlement check. A user from an org without Color Bar enabled could navigate directly to this URL.

### 4. Connect sidebar gate doesn't cover `team-chat` route (Gap)
The `ENTITLEMENT_GATES` in the sidebar gate `/admin/connect` but the Team Chat link (`/team-chat`) is a Connect feature that also requires entitlement. If Team Chat appears in the sidebar, it should be gated by `isConnectEntitled`.

---

## Proposed Changes

| File | Change |
|------|--------|
| `src/components/dashboard/analytics/PricingAnalyticsContent.tsx` | Replace `useOrganizationApps` / `hasApp('backroom')` with `useColorBarEntitlement` |
| `src/components/dashboard/SidebarNavContent.tsx` | Remove unused `useOrganizationApps` import and `activatedApps` variable; add `/team-chat` to `ENTITLEMENT_GATES` with `isConnectEntitled` |
| `src/pages/dashboard/admin/ColorBarSubscription.tsx` | Add `useColorBarEntitlement` check — redirect if org doesn't have Color Bar enabled |

### Detail: PricingAnalyticsContent
Replace `useOrganizationApps` import with `useColorBarEntitlement`. Change the guard from `!hasApp('backroom')` to `!isEntitled` (after loading check). Remove `appsLoading` references.

### Detail: Sidebar cleanup
Remove `import { useOrganizationApps }` and `const { apps: activatedApps } = useOrganizationApps()`. Add `{ hrefSuffix: '/team-chat', entitled: isConnectEntitled }` to `ENTITLEMENT_GATES`.

### Detail: ColorBarSubscription gate
Import `useColorBarEntitlement` and `Navigate`. If not entitled and not loading, redirect to dashboard home.

