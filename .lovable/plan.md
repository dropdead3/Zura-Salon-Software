

# Pre-Flight Expired Card Check on Charge Flows

## Problem

Three charge surfaces (`DockScheduleTab`, `AppointmentDetailSheet` fee charge, `AppointmentDetailSheet` manual charge) will attempt to charge an expired default card. Stripe rejects it, but the staff only sees a generic "Charge failed" error after the round-trip. A client-side pre-flight check would surface the issue immediately with an actionable message.

## Approach

Add expiration checks at each charge entry point. The card data (`card_exp_month`, `card_exp_year`) is already in the `client_cards_on_file` table but not fetched in all queries. We fetch it, check it, and warn before calling the edge function.

## Changes

### 1. Add `card_exp_month`/`card_exp_year` to card queries in `AppointmentDetailSheet`
**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

- Update the `.select()` on line 126 to include `card_exp_month, card_exp_year`
- Add an `isCardExpired` utility (same logic as `PaymentMethodsCard`)
- Before `handleChargeFee` and `handleManualCharge` proceed, check if `defaultCard` is expired. If so, `toast.error('Card ending in {last4} is expired — ask the client for a new card')` and return early

### 2. Add pre-flight check to Dock retry charge
**File:** `src/components/dock/schedule/DockScheduleTab.tsx`

- The Dock already has `card_last4` and `card_exp_month`/`card_exp_year` is not yet fetched — add `card_exp_month`/`card_exp_year` to the `DockAppointment` interface and batch card query in `useDockAppointments.ts`
- In the retry confirmation handler (line ~171), before invoking `charge-card-on-file`, check expiration. If expired, toast a warning and abort

### 3. Extend card-on-file batch query in `useDockAppointments`
**File:** `src/hooks/dock/useDockAppointments.ts`

- Add `card_exp_month`/`card_exp_year` to the `DockAppointment` interface
- Add these fields to the `.select()` in the card-on-file batch query
- Store them in the Map alongside `card_last4` and `card_brand`

### 4. Extract shared `isCardExpired` utility
**File:** `src/lib/card-utils.ts` (new)

Extract the expiration check into a shared utility so `PaymentMethodsCard`, `DockScheduleTab`, and `AppointmentDetailSheet` all use the same logic:

```typescript
export function isCardExpired(expMonth?: number | null, expYear?: number | null): boolean {
  if (!expMonth || !expYear) return false;
  const now = new Date();
  const fullYear = expYear < 100 ? 2000 + expYear : expYear;
  const expDate = new Date(fullYear, expMonth, 0);
  return now > expDate;
}
```

Update `PaymentMethodsCard` to import from `@/lib/card-utils` instead of its local copy.

## Files Summary

| File | Action |
|------|--------|
| `src/lib/card-utils.ts` | New shared utility |
| `src/hooks/dock/useDockAppointments.ts` | Add exp fields to interface + query |
| `src/components/dock/schedule/DockScheduleTab.tsx` | Pre-flight expired check on retry |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Add exp fields to query + pre-flight check on fee/manual charge |
| `src/components/dashboard/clients/PaymentMethodsCard.tsx` | Import shared `isCardExpired` |

0 migrations, 0 new edge functions, 0 new dependencies.

