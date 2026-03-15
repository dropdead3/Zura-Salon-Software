

# Dismissible Billing Alerts with Severity-Based Rules

## Overview

Add per-session dismissibility to amber-severity billing alerts while keeping red/critical alerts always visible. Dismissed state tracked via `sessionStorage` keyed by alert ID.

## Rules

- **Red alerts** (`card-expired`, `trial-expired`, `failed-payment`): Always visible, no dismiss button — these require action.
- **Amber alerts** (`card-expiring`, `trial-ending` with 3-7 days, `no-payment-method`): Show an X button. Dismissing stores the alert ID in `sessionStorage` for the current session. Alert reappears on next session.

## Changes

### 1. `useBillingAlerts.ts`

Add a `dismissible` boolean to the `BillingAlert` interface, derived from severity:
- `severity === 'amber'` → `dismissible: true`
- `severity === 'red'` → `dismissible: false`

### 2. `BillingAlertsBanner.tsx`

- Add local state using a `Set<string>` of dismissed alert IDs, initialized from `sessionStorage` key `zura_dismissed_billing_alerts` (parsed as JSON array).
- Filter out dismissed amber alerts before rendering.
- Add an `X` icon button to `AlertRow` when `alert.dismissible` is true. On click, add the alert ID to the dismissed set and persist to `sessionStorage`.
- Red alerts render without the dismiss button (unchanged).

### Files

| File | Action |
|------|--------|
| `src/hooks/useBillingAlerts.ts` | Add `dismissible` field to `BillingAlert` interface and each alert entry |
| `src/components/dashboard/settings/BillingAlertsBanner.tsx` | Add dismiss logic with sessionStorage, X button on amber alerts |

