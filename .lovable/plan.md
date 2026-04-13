

# Add Card Last 4 Digits to Retry Charge Confirmation

## Problem

The retry charge confirmation dialog says "Retry charge of $150.00 for Jane D.?" but doesn't show which card will be charged. Staff need visual confirmation they're charging the right card.

## Changes

### 1. Add `card_last4` to `DockAppointment` interface and card-on-file queries
**File:** `src/hooks/dock/useDockAppointments.ts`

- Add `card_last4?: string | null` to the `DockAppointment` interface
- In both card-on-file batch queries (demo mode ~line 232 and normal mode ~line 340), change `.select('client_id')` to `.select('client_id, card_last4')`
- Instead of storing just a Set of client IDs, store a Map of `client_id → card_last4`
- Set `a.card_last4` alongside `a.has_card_on_file`

### 2. Update confirmation dialog text
**File:** `src/components/dock/schedule/DockScheduleTab.tsx`

- Update the retry charge description (line ~322) from:
  `Retry charge of $X.XX for {client}?`
  to:
  `Retry charge of $X.XX to card ending in {last4} for {client}?`
- Fallback to current text if `card_last4` is not available

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/dock/useDockAppointments.ts` | Add `card_last4` to interface + queries |
| `src/components/dock/schedule/DockScheduleTab.tsx` | Include last 4 in confirmation text |

0 migrations, 0 new edge functions, 0 new dependencies.

