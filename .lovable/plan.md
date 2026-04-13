

# Fix Bugs & Gaps (Phorest-Free Scope)

Per your direction — no phorest table updates. Once Phorest is disconnected, only `appointments` matters.

## Confirmed Non-Issue

**B3 (amount unit):** `charge-card-on-file` already converts dollars → cents via `Math.round(amount * 100)` on line 71. No fix needed.

## Remaining Fixes

### 1. Guard retry button while dialog is open (B2 — race condition)
**File:** `src/components/dock/schedule/DockScheduleTab.tsx`

Pass `retryDisabled={!!confirmAction}` to each `DockAppointmentCard`. When truthy, the Retry button is disabled — prevents the user from switching targets mid-dialog.

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

Accept optional `retryDisabled?: boolean` prop. Apply it to the retry button's `disabled` attribute alongside existing `isRetrying`.

### 2. Guard demo-mode retry for null `total_price` (G3)
**File:** `src/components/dock/schedule/DockScheduleTab.tsx`

In the demo shortcircuit path (~line 158), add a check: if `action === 'retry_charge'` and `!appointment.total_price`, toast a warning instead of a false success.

### 3. Add `card_brand` to retry confirmation (E1)
**File:** `src/hooks/dock/useDockAppointments.ts`

- Add `card_brand?: string | null` to `DockAppointment` interface
- In the card-on-file batch query, select `card_brand` alongside `card_last4`
- Store in the Map and set on the appointment object

**File:** `src/components/dock/schedule/DockScheduleTab.tsx`

Update the retry confirmation description from:
`"Retry charge of $X.XX to card ending in 4242 for Jane D.?"`
to:
`"Retry charge of $X.XX to Visa ending in 4242 for Jane D.?"`

Fallback gracefully if `card_brand` is null.

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/dock/useDockAppointments.ts` | Add `card_brand` to interface + card query |
| `src/components/dock/schedule/DockScheduleTab.tsx` | Add retryDisabled prop pass-through, demo guard, card brand in dialog |
| `src/components/dock/schedule/DockAppointmentCard.tsx` | Accept `retryDisabled` prop |

0 migrations, 0 new edge functions, 0 new dependencies.

