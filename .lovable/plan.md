

# Conditionally Show Gated Hub Cards in Operations Hub

## Problem

The "Hiring & Payroll Hub" and "Zura Color Bar Hub" gateway cards in the Operations Hub are always visible, even when the organization doesn't have those paid app subscriptions enabled. These should only appear when the org has the respective feature flags active (`payroll_enabled` and `backroom_enabled`).

## Changes

### `src/pages/dashboard/admin/TeamHub.tsx`

- Import `usePayrollEntitlement` from `@/hooks/payroll/usePayrollEntitlement`
- Import `useColorBarEntitlement` from `@/hooks/color-bar/useColorBarEntitlement`
- Call both hooks at the top of the `TeamHub` component
- Wrap the "Hiring & Payroll Hub" `HubGatewayCard` (lines 229–234) in a conditional: only render when `isPayrollEntitled`
- Wrap the "Zura Color Bar Hub" `HubGatewayCard` (lines 259–264) in a conditional: only render when `isColorBarEntitled`

Both hooks already exist and handle org resolution with fallbacks. No new files needed.

| File | Change |
|------|--------|
| `src/pages/dashboard/admin/TeamHub.tsx` | Import entitlement hooks; conditionally render Payroll and Color Bar hub cards |

