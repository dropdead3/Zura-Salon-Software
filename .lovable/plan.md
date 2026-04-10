

# Gaps, Bugs & Enhancements — Payroll & App Gating Audit

## Issues Found

### 1. My Pay page has no payroll entitlement gate (Bug — direct URL bypass)
The sidebar hides `/dashboard/my-pay` when the user isn't enrolled, but the **page itself** has no entitlement check. Anyone who navigates directly to the URL will see the page (or an empty state). It should check `usePayrollEntitlement` and show a gate or redirect.

### 2. PaydayCountdownBanner on Dashboard Home is ungated (Bug)
`PaydayCountdownBanner` renders on the home dashboard without checking payroll entitlement or enrollment. If payroll isn't enabled for the org, this banner shouldn't appear.

### 3. Dual entitlement systems for apps (Inconsistency)
Color Bar uses **two** gating mechanisms: `organization_apps` table (sidebar apps section) AND `organization_feature_flags` (entitlement hook). Connect and Payroll only use feature flags. The sidebar `APP_KEY_MAP` at line 573 only maps Color Bar — Connect and Payroll aren't in it because they have separate filter blocks below. This works but is fragile and inconsistent. Should be unified.

### 4. Color Bar sidebar link path mismatch
The `APP_KEY_MAP` in the sidebar references `/dashboard/admin/color-bar-settings`, but the Apps Marketplace `settingsPath` is `/admin/color-bar`. These should be consistent (the sidebar one is likely the actual route).

---

## Proposed Changes

| File | Change |
|------|--------|
| `src/pages/dashboard/MyPay.tsx` | Add `usePayrollEntitlement` check — redirect or show gate when org isn't entitled |
| `src/pages/dashboard/DashboardHome.tsx` | Gate `payday_countdown` widget behind payroll entitlement + enrollment checks |
| `src/components/dashboard/SidebarNavContent.tsx` | Unify app filtering: add Connect and Payroll to `APP_KEY_MAP` pattern using feature flags, remove the separate filter blocks below (lines 584-598) to consolidate into one clean block |

### Detail: MyPay.tsx gate
```tsx
const { isEntitled, isLoading: entitlementLoading } = usePayrollEntitlement();

if (!isEntitled && !entitlementLoading) {
  return <Navigate to={dashPath('/')} replace />;
}
```

### Detail: DashboardHome payday_countdown
Wrap the `PaydayCountdownBanner` render with a condition that checks both payroll entitlement and enrollment, or move the check inside the banner component itself.

### Detail: Sidebar unification
Replace the three separate filter blocks (apps section APP_KEY_MAP, My Pay enrollment, Payroll entitlement) with a single consolidated filtering step that handles all app-gated links in one place.

