

# Zura Pay POS — Eighth-Pass Audit

## Critical Bugs

### B1: `create-terminal-payment-intent` queries non-existent column — all card payments will fail
**Severity: Critical — blocks the entire card-reader checkout flow.**
**File:** `supabase/functions/create-terminal-payment-intent/index.ts` (line 101-105)

The function queries `organizations.stripe_account_id`, but the actual column is `stripe_connect_account_id`. The query returns `null`, hitting the "Zura Pay is not connected" error on line 108 for every organization — even those fully onboarded.

**Fix:** Change the select to `.select('stripe_connect_account_id')` and reference `orgData.stripe_connect_account_id`.

### B2: `terminal-reader-display` queries `locations.stripe_account_id` — inconsistent with PI creation
**Severity: Critical — reader commands may target the wrong Stripe account or fail silently.**
**File:** `supabase/functions/terminal-reader-display/index.ts` (lines 91-99)

The PI is created on the org's Connected Account (`organizations.stripe_connect_account_id`), but the reader display/process commands resolve the Stripe account from `locations.stripe_account_id`. If `locations.stripe_account_id` is null or differs, the `process_payment` call will fail with "PaymentIntent not found" because the PI lives on a different account.

**Fix:** Query `organizations.stripe_connect_account_id` (same source as the PI creation function) instead of `locations.stripe_account_id`. Use locations as a fallback only if org-level is null.

### B3: `stripe_payment_intent_id` never persisted on appointment
**Severity: High — no audit trail linking payments to appointments.**
**File:** `src/pages/dashboard/Schedule.tsx` (lines 537-548)

The `handleCheckoutConfirm` receives `paymentMetadata.stripe_payment_intent_id` but only writes `payment_method` and `payment_status` to the `appointments` table. The PI ID is silently discarded. The `appointments` table doesn't have a `stripe_payment_intent_id` column.

**Fix:** Add a `stripe_payment_intent_id` column to `appointments` via migration. Update the `.update()` call to include `stripe_payment_intent_id: paymentMetadata.stripe_payment_intent_id`.

### B4: `pollReaderStatus` assumes "no action" means success — false positive
**Severity: High — could mark failed payments as succeeded.**
**File:** `src/hooks/useTerminalCheckoutFlow.ts` (lines 102-106)

When the reader has no active action (`!reader?.action || reader?.action?.type === undefined`), the poll returns `'succeeded'`. But the reader clears its action on both success AND failure. A genuine decline could return "succeeded" if the reader clears quickly between polls.

**Fix:** After polling completes with "no action," verify the PaymentIntent status directly by adding a `check_payment_intent` action to the edge function, or by calling `create-terminal-payment-intent` with a `verify` flag. Only return `'succeeded'` if the PI status is `succeeded`.

## Gaps

### G1: `useActiveTerminalReader` filter is a no-op
**File:** `src/hooks/useActiveTerminalReader.ts` (line 47)

```typescript
readers.filter((r) => r.location === locationId || true)
```

The `|| true` makes the filter always pass — every reader matches regardless of location. This was likely a placeholder.

**Fix:** Remove `|| true`. Filter readers by `r.location === locationId` when `locationId` is provided.

### G2: `useTerminalReaders` passes `organizationId` but `useStripeTerminals` expects `locationId`
**File:** `src/hooks/useActiveTerminalReader.ts` (line 17)

`useTerminalReaders(organizationId ?? null)` — but looking at `useStripeTerminals.ts`, the first parameter is named `locationId` and passed as `location_id` to the edge function. The hook is passing the org ID where a location ID is expected, which means the edge function receives the wrong value for reader lookup.

**Fix:** Pass `locationId` to `useTerminalReaders` instead of `organizationId`. Update the `useActiveTerminalReader` signature if needed.

### G3: `create-terminal-payment-intent` allows `stylist` role but `terminal-reader-display` does not
**File:** `create-terminal-payment-intent/index.ts` (line 93) vs `terminal-reader-display/index.ts` (line 82)

The PI creation allows `["admin", "manager", "super_admin", "stylist"]`, but the reader display function only allows `["admin", "manager", "super_admin"]`. A stylist who creates the PI successfully will get a 403 when trying to push the cart to the reader.

**Fix:** Align the role lists. Either add `stylist` to `terminal-reader-display` or remove it from `create-terminal-payment-intent`.

### G4: No `?target=deno` on Stripe imports in `create-terminal-payment-intent`
**File:** `supabase/functions/create-terminal-payment-intent/index.ts` (line 2)

Uses `https://esm.sh/stripe@18.5.0` without `?target=deno`. Pass 7 fixed this in `terminal-hardware-order` but the new function was created without it.

**Fix:** Add `?target=deno` to the Stripe import.

## Enhancements

### E1: Confirm payment succeeded before completing appointment
Currently, `handleConfirm` in `CheckoutSummarySheet` calls `onConfirm` immediately after `startCheckout` returns. If the PI was created but the reader interaction is ambiguous (see B4), the appointment could be marked completed without confirmed payment. Consider verifying PI status server-side before confirming.

---

## Immediate Changes

| File | Change |
|------|--------|
| `supabase/functions/create-terminal-payment-intent/index.ts` | Fix column name to `stripe_connect_account_id` (B1); add `?target=deno` to Stripe import (G4) |
| `supabase/functions/terminal-reader-display/index.ts` | Query `organizations.stripe_connect_account_id` instead of `locations.stripe_account_id` (B2); add `stylist` to allowed roles (G3); add `check_payment_intent` action for PI verification (B4) |
| `src/hooks/useTerminalCheckoutFlow.ts` | After poll returns "no action," verify PI status via new `check_payment_intent` action (B4) |
| `src/hooks/useActiveTerminalReader.ts` | Remove `|| true` filter no-op (G1); pass `locationId` to `useTerminalReaders` (G2) |
| `src/pages/dashboard/Schedule.tsx` | Store `stripe_payment_intent_id` in the update call (B3) |
| **Migration** | Add `stripe_payment_intent_id TEXT` column to `appointments` table (B3) |

1 migration, 0 new edge functions, 0 new dependencies.

