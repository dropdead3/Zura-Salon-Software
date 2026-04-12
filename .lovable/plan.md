

# Add "Zura Pay Not Connected" Visibility Check to Capital Control Tower

## Problem

The Control Tower currently shows "Enabled, Not Surfacing" with only two visibility conditions (Feature Flag + Qualifying Opportunities). It doesn't explain the most fundamental prerequisite: **the organization must have at least one location connected to Zura Pay (Stripe Connect)**. Without a connected Stripe account, Stripe Capital can never generate offers — so the detection pipeline will always return nothing.

## Solution

Add a third visibility check — "Zura Pay Connected" — to the diagnostic checklist. This check queries the `locations` table for the org and verifies that at least one location has `stripe_account_id IS NOT NULL` and `stripe_status = 'active'`.

## Changes

### 1. `src/hooks/useOrgCapitalDiagnostics.ts`
- Add a query for locations with `stripe_account_id` and `stripe_status` for the org
- Compute `hasActiveStripeConnect`: at least one location with `stripe_status = 'active'`
- Compute `connectedLocationCount` and `totalLocationCount` for detail text
- Add these fields to the `OrgCapitalDiagnostics` return type
- Update `sidebarVisible` to also require `hasActiveStripeConnect` (no Stripe Connect = no offers possible = sidebar should not show)

### 2. `src/pages/dashboard/platform/CapitalControlTower.tsx`
- Add "Zura Pay Connected" as a new check in the visibility checklist, positioned between "Feature Flag" and "Qualifying Opportunities"
- When not connected: detail text says "No locations connected to Zura Pay — Stripe Capital requires an active payment processing account"
- When connected: detail text says "N of M locations connected to Zura Pay"
- Update "Sidebar Visible" detail to reference all three conditions

### 3. `src/hooks/useOrgCapitalDiagnostics.ts` (type update)
- Add to `OrgCapitalDiagnostics` interface:
  - `hasActiveStripeConnect: boolean`
  - `connectedLocationCount: number`
  - `totalLocationCount: number`

## Visibility Checklist After Change

```text
✓ Feature Flag — capital_enabled is ON
✗ Zura Pay Connected — No locations connected to Zura Pay
✗ Qualifying Opportunities — No opportunities detected
✗ Sidebar Visible — All conditions above must pass
```

When connected:
```text
✓ Feature Flag — capital_enabled is ON
✓ Zura Pay Connected — 2 of 3 locations connected to Zura Pay
✗ Qualifying Opportunities — No opportunities detected
✗ Sidebar Visible — All conditions above must pass
```

## Why This Matters

This is the single most useful diagnostic for platform admins. Right now when they expand Drop Dead Salons, they see "No opportunities detected" with no explanation of *why*. The Stripe requirements list is informational but doesn't tell them what's actually missing. "Not connected to Zura Pay" is the actionable answer.

