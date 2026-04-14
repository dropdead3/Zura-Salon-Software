

## Bug, Gap & Enhancement Audit — Afterpay Integration

### Bugs

**B1. Realtime subscription hardcodes `phorest_appointments` but payment columns live on `appointments`**
The `create-checkout-payment-link` edge function writes `payment_link_url`, `payment_link_sent_at`, and `split_payment_link_intent_id` to the `appointments` table (line 139). But the realtime channel in `AppointmentDetailSheet.tsx` (line 598) listens on `phorest_appointments`. For Phorest-sourced appointments, the payment fields are on `appointments`, so the subscription will never fire. Fix: subscribe to the correct table based on `appointment._source`, or subscribe to `appointments` since that's where payment fields are written.

**B2. `handleCheckoutCompleted` queries only `appointments` — may miss `phorest_appointments`**
The webhook handler (line 326–330) looks up `split_payment_terminal_intent_id` and `paid_at` from the `appointments` table only. If the appointment originates from Phorest sync, these fields might not exist on the `appointments` row, or the Phorest appointment may be the canonical record. This could cause the "paid" status to never resolve for split payments on Phorest appointments.

**B3. `CheckoutSummarySheet` hardcodes `afterpayEnabled={true}`**
Line 791 passes `afterpayEnabled={true}` regardless of the org's actual `afterpay_enabled` setting. This means the "Send to Pay / Afterpay" button and split-payment logic appear even when Afterpay is disabled. Fix: query the org's `afterpay_enabled` flag and pass the real value.

**B4. `PaymentLinkStatusBadge` has no `onResend` prop wired in `AppointmentDetailSheet`**
The badge component accepts `onResend` and `isResending` props for resending/creating new links, but the usage in `AppointmentDetailSheet.tsx` (line 2146–2153) passes neither. Staff see "Resend" and "Create New Link" buttons that do nothing — they're not rendered because `onResend` is undefined, but the expired state also lacks a recovery path entirely.

**B5. `SplitPaymentDialog` updates `appointments` table directly (line 99–105)**
The dialog does a raw `.from('appointments').update(...)` without checking `_source`. This is redundant anyway — `create-checkout-payment-link` already writes these fields to the same table. The duplicate update could cause race conditions or overwrite the edge function's data.

### Gaps

**G1. No `checkout.session.completed` handling for Connect events**
The webhook switch (line 1427) calls `handleCheckoutCompleted` for all `checkout.session.completed` events, but the payment link sessions are created on **Connected Accounts** (via `stripeAccount` param). Stripe sends Connect events with `event.account` set. The handler doesn't discriminate, so this works, but there's no explicit guard ensuring the appointment belongs to the correct org — a malicious or misconfigured connected account could theoretically mark any appointment as paid.

**G2. No RLS on payment link columns**
The `appointments` table update in the edge function uses the service role key (bypasses RLS), which is correct. But the `SplitPaymentDialog` frontend does a direct `.from('appointments').update(...)` using the anon client — if RLS policies don't permit updates to `split_payment_link_intent_id`/`payment_link_url`, this silently fails.

**G3. `SendToPayButton` doesn't invalidate queries after success**
The `onPaymentLinkSent` callback exists but the caller in `CheckoutSummarySheet` doesn't pass it. After sending a payment link, the checkout UI shows no feedback that the appointment record has been updated.

**G4. Payment link `success_url` / `cancel_url` point to Supabase URL**
In `create-checkout-payment-link` (line 106), the fallback `baseUrl` is `SUPABASE_URL`, so the client lands on something like `https://vciqm....supabase.co/payment-success` — a non-existent page. These should point to the org's booking surface or the platform domain.

**G5. `send-payment-link` sets `payment_link_sent_at` again (line 139)**
The `create-checkout-payment-link` function already writes `payment_link_sent_at` (line 142). The `send-payment-link` function also writes it (line 139). The second write overwrites the first, creating a small timing discrepancy — the "sent at" timestamp reflects when the SMS/email was dispatched rather than when the link was created. This isn't critical but could cause the 24h expiry to be slightly off.

### Enhancements

**E1. Wire `onResend` in `AppointmentDetailSheet`**
Pass a resend handler to `PaymentLinkStatusBadge` that re-invokes the `create-checkout-payment-link` and `send-payment-link` flow for the current appointment. This enables staff to create new links when existing ones expire.

**E2. Use org's `afterpay_enabled` in `CheckoutSummarySheet`**
Query the org setting and conditionally render the `SendToPayButton` only when enabled (or always show it but with `afterpayEnabled` reflecting the real value).

**E3. Configure proper `success_url` and `cancel_url`**
Use the org's booking surface URL or a dedicated payment confirmation page. Could use `PUBLIC_URL` env var or construct from `window.location.origin`.

**E4. Remove redundant appointment update from `SplitPaymentDialog`**
The edge function already writes the session data. The client-side update is redundant and potentially harmful.

---

### Implementation Plan

| Priority | ID | File | Change |
|----------|----|------|--------|
| P0 | B3 | `CheckoutSummarySheet.tsx` | Query `afterpay_enabled` from org, pass real value |
| P0 | B4+E1 | `AppointmentDetailSheet.tsx` | Wire `onResend` prop to badge, call edge functions |
| P0 | B1 | `AppointmentDetailSheet.tsx` | Fix realtime subscription to listen on `appointments` table |
| P1 | B5/E4 | `SplitPaymentDialog.tsx` | Remove redundant `.update()` call |
| P1 | G4/E3 | `create-checkout-payment-link/index.ts` | Fix `success_url`/`cancel_url` fallbacks |
| P1 | G5 | `send-payment-link/index.ts` | Remove duplicate `payment_link_sent_at` write |
| P1 | G3 | `CheckoutSummarySheet.tsx` | Pass `onPaymentLinkSent` callback to invalidate queries |
| P2 | B2 | `stripe-webhook/index.ts` | Add org_id verification in `handleCheckoutCompleted` |

No database changes required. All fixes are code-level.

