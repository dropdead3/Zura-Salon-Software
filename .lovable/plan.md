

# Add Zura Payroll as a Gated App

## Problem

Payroll functionality (the Hiring & Payroll Hub at `/admin/payroll` and the sidebar "My Pay" link) is currently accessible to all organizations. It should be a gated app — matching the pattern used by Zura Connect and Color Bar — so organizations must be activated before accessing payroll features. This app will be powered by Gusto APIs.

## Changes

### 1. Create `usePayrollEntitlement` hook

New file: `src/hooks/payroll/usePayrollEntitlement.ts`

Mirror the `useConnectEntitlement` pattern — check `organization_feature_flags` for flag key `payroll_enabled`. Returns `{ isEntitled, isLoading }`.

### 2. Create `PayrollSubscriptionGate` component

New file: `src/components/payroll/PayrollSubscriptionGate.tsx`

Mirror `ConnectSubscriptionGate` — shows a branded upsell page when the org is not entitled. Highlights Gusto-powered features: automated tax filing, direct deposit, W-2s, benefits administration, commission integration.

### 3. Gate the Payroll page

**`src/pages/dashboard/admin/Payroll.tsx`**:
- Import `usePayrollEntitlement`
- If not entitled, render `PayrollSubscriptionGate` instead of the payroll hub content

### 4. Gate the sidebar link

**`src/components/dashboard/SidebarNavContent.tsx`**:
- Import `usePayrollEntitlement`
- Hide the `/admin/payroll` sidebar link when `!isPayrollEntitled` (same filtering pattern already used for My Pay enrollment check)
- The existing My Pay enrollment check remains — it independently hides My Pay based on individual enrollment

### 5. Add Zura Payroll to Apps Marketplace

**`src/pages/dashboard/AppsMarketplace.tsx`**:
- Add a new entry to `SUBSCRIBED_APPS` array:
  - `key: 'payroll'`, `name: 'Zura Payroll'`, `tagline: 'Compensation Intelligence'`
  - `icon: DollarSign`, green gradient
  - `settingsPath: '/admin/payroll'`
  - Features: Gusto-powered payroll, automated tax compliance, direct deposit, commission integration
- Update `getActiveStatus` to check payroll entitlement (import `usePayrollEntitlement`)

### 6. Add Payroll toggle to Platform Admin AccountAppsCard

**`src/components/platform/account/AccountAppsCard.tsx`**:
- Add a third row for "Zura Payroll" with `DollarSign` icon
- Toggle `payroll_enabled` feature flag (same pattern as Color Bar and Connect)

### 7. Seed the feature flag

Database migration to insert `payroll_enabled` into `organization_feature_flags` for existing orgs (defaulting to `false`), or ensure the entitlement hook handles missing rows gracefully (it will — `maybeSingle` returns null, defaults to `false`).

## Files

| File | Action |
|------|--------|
| `src/hooks/payroll/usePayrollEntitlement.ts` | Create — mirrors `useConnectEntitlement` |
| `src/components/payroll/PayrollSubscriptionGate.tsx` | Create — upsell gate component |
| `src/pages/dashboard/admin/Payroll.tsx` | Edit — wrap content with entitlement check |
| `src/components/dashboard/SidebarNavContent.tsx` | Edit — hide payroll sidebar link when not entitled |
| `src/pages/dashboard/AppsMarketplace.tsx` | Edit — add Zura Payroll app card |
| `src/components/platform/account/AccountAppsCard.tsx` | Edit — add payroll toggle |

