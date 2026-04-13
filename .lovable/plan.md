

# Cancellation Fee Refund Sync + Client Cards on File Management

## Analysis

**1. `charge.refunded` and cancellation fees:**
The existing `handleChargeRefunded` handler only looks up appointments by `stripe_payment_intent_id` — the standard service-payment PI. Cancellation fee charges use a *different* PI stored in `cancellation_fee_stripe_payment_id`, so refunds of cancellation fees issued via the Stripe Dashboard will be silently ignored. The handler needs a second lookup path.

**2. Client "Cards on File" section:**
The `ClientDetailSheet` has tabs for Visit History, Transformations, Transactions, Formulas, Notes, and Redos — but no card management. The `client_cards_on_file` table and `useClientCardsOnFile` hook already exist. The gap is purely UI: a section to list, add, and remove saved cards.

---

## Changes

### 1. Webhook — Handle cancellation fee refunds
**File:** `supabase/functions/stripe-webhook/index.ts`

Extend `handleChargeRefunded`: after the existing `stripe_payment_intent_id` lookup fails to find an appointment, add a fallback lookup on `cancellation_fee_stripe_payment_id`. If matched, update `cancellation_fee_status` to `'refunded'` and `cancellation_fee_charged` to reflect the refunded amount.

### 2. Client Detail — Cards on File section
**File:** `src/components/dashboard/ClientDetailSheet.tsx`

Add a "Payment Methods" card in the client info area (above the tabs, near contact info). Contents:
- List saved cards from `useClientCardsOnFile(orgId, client.id)` — show brand icon, last4, expiry, default badge
- "Remove" button per card (calls `useRemoveCardOnFile` mutation)
- "Set Default" action for non-default cards
- Empty state: "No cards on file"

Card addition is handled during the booking flow (Stripe Elements SetupIntent), so no "Add Card" button is needed here — this is a management/view surface only.

### 3. Hook — Add "Set Default" mutation
**File:** `src/hooks/useDepositData.ts`

Add a `useSetDefaultCard` mutation that sets `is_default = false` on all other cards for the client, then `is_default = true` on the selected card.

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Extend `handleChargeRefunded` with cancellation-fee PI fallback |
| `src/components/dashboard/ClientDetailSheet.tsx` | Add "Payment Methods" card section with card list, remove, and set-default actions |
| `src/hooks/useDepositData.ts` | Add `useSetDefaultCard` mutation |

0 migrations, 0 new edge functions, 0 new dependencies.

