

# G1 Deliverable B: Stripe Elements on Public Booking Surface

## Problem
Services with `requires_deposit` or `require_card_on_file` create appointments but never collect payment. The confirmation page shows policy text, but the button always says "Confirm Booking." No card input exists on the booking surface.

## Approach
Add Stripe Elements (SetupIntent for card-on-file, PaymentIntent for deposits) to the booking confirmation step. The flow:

1. Client fills booking details as before
2. On the confirm step, if the service requires deposit or card-on-file, a Stripe card input appears
3. Client enters card details and clicks "Confirm & Pay Deposit" or "Confirm & Save Card"
4. Frontend creates the appointment first (via existing `create-public-booking`), then processes payment
5. If payment fails, the appointment still exists as `pending` — staff can follow up

## Prerequisites
- **New secret needed:** `STRIPE_PUBLISHABLE_KEY` — the publishable key for the org's Connect platform account (needed client-side to initialize Stripe.js). This must be added as a runtime secret.
- **New npm packages:** `@stripe/react-stripe-js` and `@stripe/stripe-js`

## Changes

### 1. New edge function: `create-booking-payment-intent`
Creates either a SetupIntent (card-on-file only) or PaymentIntent (deposit) on the org's Connected Account.

- **Input:** `organization_id`, `appointment_id`, `amount` (optional — 0 for card-on-file only), `client_email`
- **No auth required** — public endpoint, but validates the appointment exists and belongs to the org
- **Logic:**
  - Looks up org's `stripe_connect_account_id`
  - Finds or creates a Stripe Customer on the Connected Account by email
  - If deposit: creates a PaymentIntent with `capture_method: automatic`, returns `client_secret`
  - If card-on-file only: creates a SetupIntent, returns `client_secret`
  - Returns `client_secret`, `intent_type` ("payment" or "setup"), and `stripe_connect_account_id` (needed for `stripeAccount` option in Elements)

### 2. New edge function: `get-booking-stripe-config`
Returns the publishable key and Connected Account ID for a given org so the frontend can initialize `loadStripe()` with the correct `stripeAccount`.

- **Input:** `organization_id`
- **Returns:** `publishable_key` (from env), `connected_account_id` (from org row)
- Lightweight, no auth required

### 3. New component: `BookingPaymentForm`
**File:** `src/components/booking-surface/BookingPaymentForm.tsx`

- Wraps Stripe `<Elements>` provider and `<PaymentElement>` (or `<CardElement>`)
- Initialized with the `client_secret` from step 1
- Handles `stripe.confirmPayment()` or `stripe.confirmSetup()`
- On success, calls `onPaymentComplete(paymentIntentId)`
- On error, shows inline error message and allows retry
- Styled to match the booking surface theme (uses CSS variables from `BookingThemeProvider`)

### 4. Update `BookingConfirmation`
**File:** `src/components/booking-surface/BookingConfirmation.tsx`

- When `depositAmount > 0` or `requiresCardOnFile`:
  - After appointment creation succeeds, show `BookingPaymentForm` instead of the success screen
  - Button text changes: "Confirm & Pay Deposit" / "Confirm & Save Card"
- When no payment required: existing flow (immediate success screen)

### 5. Update `HostedBookingPage`
**File:** `src/components/booking-surface/HostedBookingPage.tsx`

- After `create-public-booking` succeeds and returns `requires_deposit` or `requires_card_on_file`:
  1. Call `create-booking-payment-intent` with the new `appointment_id`
  2. Pass `clientSecret` and `intentType` to `BookingConfirmation`
- Load Stripe via `get-booking-stripe-config` on mount (lazy — only fetched if any eligible service has payment requirements)

### 6. Install dependencies
- `@stripe/react-stripe-js`
- `@stripe/stripe-js`

## Revised Confirm Flow

```text
Client clicks "Confirm"
  │
  ├─ No payment needed ──► create-public-booking ──► Success screen
  │
  └─ Payment needed ──► create-public-booking ──► create-booking-payment-intent
                                                       │
                                                       ▼
                                                  Show card form
                                                       │
                                              ┌────────┴────────┐
                                              │                 │
                                         Success            Failure
                                              │                 │
                                         Show success     Show error
                                         screen           (retry or
                                                          staff follows up)
```

## Security Notes
- The publishable key is safe to expose client-side — it's designed for that purpose
- PaymentIntents/SetupIntents are created on the Connected Account (`stripeAccount` option), so funds flow directly to the salon
- The edge function validates appointment ownership before creating intents
- Rate limiting from `create-public-booking` already prevents spam

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/create-booking-payment-intent/index.ts` | New — creates PI or SI on Connected Account |
| `supabase/functions/get-booking-stripe-config/index.ts` | New — returns publishable key + connected account ID |
| `src/components/booking-surface/BookingPaymentForm.tsx` | New — Stripe Elements card input |
| `src/components/booking-surface/BookingConfirmation.tsx` | Add payment form integration |
| `src/components/booking-surface/HostedBookingPage.tsx` | Orchestrate payment intent creation |
| `package.json` | Add `@stripe/react-stripe-js`, `@stripe/stripe-js` |

2 new edge functions, 0 migrations, 2 new dependencies.

**Prerequisite:** `STRIPE_PUBLISHABLE_KEY` must be added as a runtime secret before the frontend can initialize Stripe.js.

