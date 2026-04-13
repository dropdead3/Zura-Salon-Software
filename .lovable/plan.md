

# Zura Pay Build Audit — Round 3

## Bugs

### B1: `charge-card-on-file` has NO authentication (P0 — Security)
The edge function accepts a raw JSON body and immediately charges a card using a service-role client. There is no `Authorization` header check, no `getUser()` call, no role verification. Any caller who knows an `organization_id` and `client_id` can charge any card for any amount. This is the most critical finding across the entire Zura Pay surface.

Compare with `process-stripe-refund` (has auth + role check) and `reconcile-till` (has auth). `charge-card-on-file` has none.

**Fix:** Add JWT extraction, `getUser()`, and org-membership/role check before processing.

### B2: `collect-booking-deposit` has NO authentication (P0 — Security)
Same pattern as B1. No auth header check, no user validation. Anyone can create pre-authorized holds against any card on file.

**Fix:** Same approach — add auth + role or membership verification.

### B3: Connected account lookup inconsistency (P1 — Data)
`charge-card-on-file` and `collect-booking-deposit` look up the connected account from `organization_stripe_accounts.stripe_account_id`, while `process-stripe-refund`, `reconcile-till`, `create-terminal-payment-intent`, and `connect-zura-pay` all use `organizations.stripe_connect_account_id`. If these tables are ever out of sync, charges succeed but refunds (or vice versa) target the wrong account — or fail silently.

**Fix:** Standardize both functions to use `organizations.stripe_connect_account_id` (the canonical source used by onboarding).

### B4: Outdated Stripe SDK in payment-critical functions (P2)
`charge-card-on-file`, `collect-booking-deposit`, and `detach-card-on-file` use `stripe@14.21.0` with `apiVersion: "2023-10-16"`. Other functions (`process-stripe-refund`, `reconcile-till`) use `stripe@18.5.0` with `apiVersion: "2025-08-27.basil"`. Mixed SDK versions can cause subtle payload differences, especially around PaymentIntent confirmation behavior.

**Fix:** Upgrade all three to `stripe@18.5.0` and `apiVersion: "2025-08-27.basil"`.

### B5: `AppointmentDetailSheet` card query missing `card_exp_month`/`card_exp_year` (P2)
The pre-flight expired card check was added to `handleChargeFee` and `handleManualCharge`, but the query on line 126 still only selects `id, card_brand, card_last4, is_default`. The expiration fields are never fetched, so `isCardExpired()` always returns `false`.

**Fix:** Add `card_exp_month, card_exp_year` to the `.select()` on line 126.

## Gaps

### G1: Public booking surface still a UI shell (P1 — carried forward)
`handleConfirm` in `HostedBookingPage.tsx` (line 128) only sets `isConfirmed: true`. No appointment is created, no deposit collected, no card captured. `BookingConfirmation` receives no `depositAmount`, `requiresCardOnFile`, or policy text props. The `collect-booking-deposit` edge function exists but is never called.

This is the largest functional gap. Services marked `require_card_on_file` or `requires_deposit` can be booked without any enforcement.

### G2: `charge-card-on-file` ignores `fee_type` parameter (P2)
The frontend sends `fee_type: 'cancellation' | 'no_show' | 'manual'` but the edge function never reads it. All charges are recorded identically — there's no differentiation in Stripe metadata or the appointment update for fee type, which makes reconciliation and reporting ambiguous.

**Fix:** Include `fee_type` in the PaymentIntent metadata and, for non-cancellation charges, skip the cancellation-specific appointment update.

### G3: No idempotency on card-on-file charges (P2)
If a staff member double-clicks "Charge" before the dialog closes (or network is slow), two identical PaymentIntents can be created. There is no idempotency key on `stripe.paymentIntents.create()`.

**Fix:** Generate an idempotency key from `appointment_id + fee_type + amount` and pass it to the Stripe call.

## Enhancements

### E1: Webhook doesn't handle Connect-scoped `charge.failed` (P3)
The webhook routes `charge.failed` only for non-Connect events (`!isConnectEvent`). When a card-on-file charge fails on a Connected Account, no webhook handler fires. The frontend gets the error from the edge function response, but if the client closes the browser mid-request, the failure isn't recorded via webhook.

**Fix:** Add a Connect-aware `charge.failed` handler that updates `appointments.payment_status = 'failed'` using the PI metadata.

## Recommended Immediate Fixes (B1 + B2 + B3 + B5)

These are security-critical and should ship before any new features.

### Changes

**Modified:** `supabase/functions/charge-card-on-file/index.ts`
- Add auth: extract JWT, call `getUser()`, verify org membership
- Switch connected account lookup from `organization_stripe_accounts` to `organizations.stripe_connect_account_id`
- Upgrade Stripe SDK to `stripe@18.5.0` / `apiVersion: "2025-08-27.basil"`
- Add `fee_type` to PI metadata
- Add idempotency key

**Modified:** `supabase/functions/collect-booking-deposit/index.ts`
- Add auth: extract JWT, call `getUser()`, verify org membership
- Switch connected account lookup to `organizations.stripe_connect_account_id`
- Upgrade Stripe SDK to `stripe@18.5.0` / `apiVersion: "2025-08-27.basil"`

**Modified:** `supabase/functions/detach-card-on-file/index.ts`
- Switch connected account lookup to `organizations.stripe_connect_account_id`
- Upgrade Stripe SDK to `stripe@17.7.0` → `stripe@18.5.0` / update apiVersion

**Modified:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`
- Add `card_exp_month, card_exp_year` to the card query `.select()` on line 126

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/charge-card-on-file/index.ts` | Add auth + standardize account lookup + upgrade SDK + idempotency |
| `supabase/functions/collect-booking-deposit/index.ts` | Add auth + standardize account lookup + upgrade SDK |
| `supabase/functions/detach-card-on-file/index.ts` | Standardize account lookup + upgrade SDK |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Fix missing exp fields in card query |

0 migrations, 0 new edge functions, 0 new dependencies.

