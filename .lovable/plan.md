

# Add "Retry Charge" Button to Dock Appointment Card

## Problem

When a card-on-file charge fails, staff see a "Failed" badge with the decline reason but have no way to retry the charge from the Dock. They must navigate to the Operations Hub or Scheduler — breaking their workflow.

## Approach

Add a "Retry" button inline with the "Failed" badge on the Dock card. Tapping it opens a confirmation dialog, then invokes the existing `charge-card-on-file` edge function. The button only appears when the appointment has both `payment_status: 'failed'` and a saved card on file for the client.

## Changes

### 1. Extend `DockAppointment` interface and queries
**File:** `src/hooks/dock/useDockAppointments.ts`

- Add `phorest_client_id` is already there — also add `total_price?: number | null` to the interface
- Include `total_price` in both phorest and local appointment select queries
- After fetching appointments, batch-query `client_cards_on_file` for any appointments with `payment_status: 'failed'` to check if a default card exists — store as `has_card_on_file?: boolean` on the interface

### 2. Add `onRetryCharge` callback to `DockAppointmentCard`
**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

- Accept new optional prop `onRetryCharge?: (appointment: DockAppointment) => void`
- When `payment_status === 'failed'` and `has_card_on_file` is true, render a small "Retry" button next to the "Failed" badge
- Style: subtle pill button using `DOCK_BADGE`-like styling in blue/primary tones, with a `RefreshCw` icon
- Button calls `onRetryCharge` — the parent handles the actual charge logic

### 3. Add retry charge handler in the Dock schedule parent
**File:** `src/components/dock/schedule/DockScheduleTab.tsx` (or whichever component renders `DockAppointmentCard`)

- Import `useOrganizationContext` for org ID
- Create `handleRetryCharge` that:
  1. Shows an `AlertDialog` confirmation (mandatory for financial actions per governance rules)
  2. Invokes `charge-card-on-file` with `organization_id`, `appointment_id`, `client_id` (from `phorest_client_id`), and `amount` (from `total_price`)
  3. On success: toast + invalidate dock appointments query
  4. On failure: toast with error message
- Pass `onRetryCharge={handleRetryCharge}` to each card

### 4. Design token entry
**File:** `src/components/dock/dock-ui-tokens.ts`

- Add `retryAction` token for the inline retry button styling (small pill, primary color scheme)

## UI Behavior

```text
┌─────────────────────────────────────────────┐
│  Jane D. · Balayage + Toner   Failed ⓘ  ↻  │
│  10:30 AM – 12:30 PM · 2h                   │
└─────────────────────────────────────────────┘
                                          ↑
                                    Retry button
                                 (only if card on file)
```

- "Retry" button is a small icon-pill next to the Failed badge
- Tapping opens an `AlertDialog`: "Retry charge of $X.XX to card ending in ••••?"
- Confirm triggers the charge; cancel dismisses
- During charge, button shows a loading spinner
- On success, the webhook will update `payment_status` to `paid` and clear `payment_failure_reason` — the query invalidation will refresh the card

## Governance Compliance

- Financial action protected by `AlertDialog` confirmation
- Uses existing `charge-card-on-file` edge function (no new backend)
- Organization-scoped via `useOrganizationContext`

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/dock/useDockAppointments.ts` | Add `total_price`, `has_card_on_file` to interface + queries |
| `src/components/dock/dock-ui-tokens.ts` | Add `retryAction` token |
| `src/components/dock/schedule/DockAppointmentCard.tsx` | Add retry button next to Failed badge |
| `src/components/dock/schedule/DockScheduleTab.tsx` | Add `handleRetryCharge` with AlertDialog + edge function call |

0 migrations, 0 new edge functions, 0 new dependencies.

