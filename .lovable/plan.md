

# Move Payouts Dashboard to Payment Operations

## Problem
The Payouts section was placed in the Zura Pay Configurator (Settings). It belongs in Payment Operations — the daily operational surface where financial tasks are managed.

## Changes

### 1. `src/pages/dashboard/admin/PaymentOps.tsx`
- Import `ZuraPayPayoutsTab` and `useOrgConnectStatus`
- Add a collapsible "Payouts & Balance" section at the top of the page content (above Till Reconciliation), conditionally rendered when `stripe_connect_status === 'active'`
- Use a `Collapsible` wrapper with a card header so operators can collapse it when focusing on other tasks

### 2. `src/components/dashboard/settings/TerminalSettingsContent.tsx`
- Remove the `ZuraPayPayoutsTab` import (line 35)
- Remove the Payouts `TabsTrigger` (lines 389-391)
- Remove the Payouts `TabsContent` block (lines 447-453)

### 3. No changes to `ZuraPayPayoutsTab.tsx`
The component is self-contained — fetches its own org context and data internally.

## Technical Notes
- `useOrgConnectStatus` may already be available in PaymentOps scope (used by other sections); if not, import it from `useZuraPayConnect`
- No migrations, no edge function changes, no new dependencies

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/PaymentOps.tsx` | Add Payouts section at top |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Remove Payouts tab |

