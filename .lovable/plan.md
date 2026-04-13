

# Zura Pay Build Audit — Round 4

## Bugs

### B1: Pre-flight expired card check was never implemented (P1 — Regression)
The shared `src/lib/card-utils.ts` utility was approved and "created" in a prior round but **does not exist on disk**. Consequently:
- `AppointmentDetailSheet` `handleChargeFee` and `handleManualCharge` have **no expiration guard** — charges proceed to Stripe and fail with a generic error
- `DockScheduleTab` retry flow has **no expiration guard** — same issue
- `useDockAppointments.ts` never fetches `card_exp_month`/`card_exp_year`
- `PaymentMethodsCard` still uses a local `isCardExpired` function instead of the shared one

The prior plan's entire deliverable was lost. Must re-implement from scratch.

### B2: `send-payment-setup-link` uses outdated Stripe SDK (P2)
Uses `stripe@14.21.0` with `apiVersion: "2023-10-16"`. All other Zura Pay payment functions were upgraded to `v18.5.0` / `2025-08-27.basil` in the last round. This function creates Checkout Sessions for platform billing setup — SDK mismatch can cause subtle API behavior differences.

### B3: Webhook `organization_stripe_accounts` lookup inconsistency (P2 — carried forward)
Four webhook handlers (`handlePaymentMethodDetached`, `handlePaymentMethodUpdated`, `handleSetupIntentSucceeded`, `handleCustomerDeleted`) look up the org via `organization_stripe_accounts.stripe_account_id`. All edge functions were standardized to `organizations.stripe_connect_account_id` in the last round, but the webhook was not updated. If these tables drift, card sync events silently fail.

### B4: `create-public-booking` doesn't persist `card_on_file_required` (P2)
The edge function returns `requires_card_on_file: true` but never writes it to the appointment row. The insert payload (line 170-196) includes `deposit_required` but omits `card_on_file_required`. Staff reviewing the appointment later have no visibility into whether a card was expected.

### B5: `depositPolicyText` and `cancellationPolicyText` use same source (P3 — UX)
`HostedBookingPage` passes `hosted.policyText` to **both** `depositPolicyText` and `cancellationPolicyText` (lines 277-278). These should be separate configurable values from `booking_policies` settings (`deposit_policy_text` and `cancellation_policy_text`), which already exist in `useBookingPolicies`. The generic `policyText` is a fallback, not a substitute.

## Gaps

### G1: No Stripe Elements on booking surface (Deliverable B — carried forward)
Public booking creates appointments but cannot collect deposits or cards. Services marked `requires_deposit` or `require_card_on_file` create appointments without enforcement. The confirmation page shows policy text but the button always says "Confirm Booking" — never "Confirm & Pay Deposit".

This is acknowledged as Phase 2 and not addressed in this plan.

## Recommended Fixes

### Changes

**New file:** `src/lib/card-utils.ts`
- Create `isCardExpired(expMonth, expYear)` utility

**Modified:** `src/components/dashboard/clients/PaymentMethodsCard.tsx`
- Remove local `isCardExpired`, import from `@/lib/card-utils`
- Adapt call site (pass `card.card_exp_month, card.card_exp_year` instead of full card object)

**Modified:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`
- Import `isCardExpired` from `@/lib/card-utils`
- Add pre-flight check in `handleChargeFee` and `handleManualCharge`: if `defaultCard` is expired, `toast.error(...)` and return early

**Modified:** `src/hooks/dock/useDockAppointments.ts`
- Add `card_exp_month`, `card_exp_year` to interface and card batch query

**Modified:** `src/components/dock/schedule/DockScheduleTab.tsx`
- Import `isCardExpired` from `@/lib/card-utils`
- Add pre-flight check before retry charge

**Modified:** `supabase/functions/send-payment-setup-link/index.ts`
- Upgrade `stripe@14.21.0` to `stripe@18.5.0` and `apiVersion` to `2025-08-27.basil`

**Modified:** `supabase/functions/stripe-webhook/index.ts`
- In `handlePaymentMethodDetached`, `handlePaymentMethodUpdated`, `handleSetupIntentSucceeded`, `handleCustomerDeleted`: change `organization_stripe_accounts` lookup to `organizations` table using `stripe_connect_account_id`

**Modified:** `supabase/functions/create-public-booking/index.ts`
- Add `card_on_file_required: requireCardOnFile` to the appointment insert payload

**Modified:** `src/components/booking-surface/HostedBookingPage.tsx`
- Fetch `booking_policies` settings and pass `deposit_policy_text` / `cancellation_policy_text` as separate props instead of using `hosted.policyText` for both

## Files Summary

| File | Action |
|------|--------|
| `src/lib/card-utils.ts` | New — shared expiration utility |
| `src/components/dashboard/clients/PaymentMethodsCard.tsx` | Import shared utility |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Add pre-flight expired card check |
| `src/hooks/dock/useDockAppointments.ts` | Add exp fields to query |
| `src/components/dock/schedule/DockScheduleTab.tsx` | Add pre-flight expired card check |
| `supabase/functions/send-payment-setup-link/index.ts` | Upgrade Stripe SDK |
| `supabase/functions/stripe-webhook/index.ts` | Standardize org lookup in 4 handlers |
| `supabase/functions/create-public-booking/index.ts` | Persist `card_on_file_required` |
| `src/components/booking-surface/HostedBookingPage.tsx` | Use dedicated policy text fields |

0 migrations, 0 new edge functions, 0 new dependencies.

