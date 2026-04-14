

## Afterpay Integration with Smart Split-Payment for High-Value Transactions

Your thinking is exactly right. If a $5,000 transformation exceeds Afterpay's $4,000 ceiling, the system splits it: the client pays the overage immediately (e.g. $1,000 via card on the terminal), and the remaining $4,000 is sent as an Afterpay-eligible payment link to their phone. Clean, transparent, no friction.

---

### How It Works (User Flow)

**In-Person Checkout — Standard (under $4,000):**
1. Staff taps "Send to Pay" instead of "Process on Terminal"
2. Client receives SMS/email with a Stripe-hosted payment page
3. Afterpay appears as a payment option alongside card
4. Client completes payment; appointment auto-marks as paid

**In-Person Checkout — Split (over $4,000):**
1. System detects total exceeds $4,000, displays a split-payment prompt
2. Staff confirms the split: e.g. "$1,000 on terminal now + $4,000 via Afterpay link"
3. Terminal processes the immediate card payment for $1,000
4. System sends a $4,000 payment link (Afterpay-eligible) to the client
5. Both payments tracked against the same appointment
6. Appointment only marks "paid" when both legs complete

**Online Booking Deposits:**
- Afterpay automatically appears in the Payment Element for eligible amounts ($1–$4,000)
- No split needed for deposits (they're typically well under $4,000)

---

### Technical Plan

#### 1. Database Migration

```sql
-- Afterpay org-level toggle
ALTER TABLE public.organizations
  ADD COLUMN afterpay_enabled boolean NOT NULL DEFAULT false;

-- Track split payments on appointments
ALTER TABLE public.appointments
  ADD COLUMN split_payment_terminal_intent_id text,
  ADD COLUMN split_payment_link_intent_id text,
  ADD COLUMN payment_link_url text,
  ADD COLUMN payment_link_sent_at timestamptz;
```

#### 2. Edge Function: `create-checkout-payment-link`

New edge function that creates a Stripe Checkout Session (not a PaymentIntent) on the Connected Account:
- Accepts `organization_id`, `appointment_id`, `amount_cents`, `client_email`, `client_phone`
- If org has `afterpay_enabled` and amount is within $1–$4,000: includes `afterpay_clearpay` in `payment_method_types`
- Creates a Stripe Checkout Session with `mode: 'payment'` and the appropriate payment methods
- Returns the hosted checkout URL
- Stores the URL and timestamp on the appointment record

#### 3. Edge Function: `send-payment-link`

Sends the checkout URL to the client via SMS (primary) and/or email (fallback):
- Uses existing `_shared/sms-sender.ts` and `_shared/email-sender.ts`
- Template: "Hi {name}, here's your payment link for {salon}: {url}"

#### 4. Update `create-booking-payment-intent`

For online booking deposits, conditionally add `afterpay_clearpay` to the PaymentIntent's `payment_method_types` when:
- Org has `afterpay_enabled = true`
- Amount is between $1.00 and $4,000.00 (100–400000 cents)

No frontend changes needed — the existing `PaymentElement` auto-renders Afterpay when the intent supports it.

#### 5. Frontend: Split Payment UI in Checkout Flow

**New component: `SendToPayButton.tsx`** in `src/components/dashboard/appointments/`
- "Send Payment Link" action alongside "Process on Terminal"
- When total > $4,000 and Afterpay is enabled, shows a split-payment dialog:
  - Displays: "Total: $5,000 — Afterpay max: $4,000"
  - Calculated split: "Pay $1,000 now on terminal · $4,000 via Afterpay link"
  - Staff can adjust the split (minimum immediate = total - $4,000)
  - Confirm triggers: terminal intent for immediate portion → payment link for remainder

**New component: `SplitPaymentDialog.tsx`**
- Shows the breakdown clearly
- Handles the two-step flow (terminal first, then send link)
- Tracks completion of both legs

#### 6. Admin Settings: Afterpay Toggle

Add to the Zura Pay settings page (terminals settings area):
- Toggle: "Enable Afterpay / Pay in 4"
- Info text: "Allow clients to pay in 4 interest-free installments for transactions up to $4,000. For higher amounts, the system automatically splits into an immediate card payment and an Afterpay-eligible payment link."
- Saves to `organizations.afterpay_enabled`

#### 7. Webhook Updates

Extend existing `payment_intent.succeeded` / `checkout.session.completed` handler:
- When a payment link checkout completes, update `split_payment_link_intent_id` on the appointment
- Check if both split legs are complete; if so, mark appointment as fully paid
- Send receipt/confirmation to client

---

### Files Created / Modified

| Action | File |
|--------|------|
| Create | `supabase/functions/create-checkout-payment-link/index.ts` |
| Create | `supabase/functions/send-payment-link/index.ts` |
| Create | `src/components/dashboard/appointments/SendToPayButton.tsx` |
| Create | `src/components/dashboard/appointments/SplitPaymentDialog.tsx` |
| Modify | `supabase/functions/create-booking-payment-intent/index.ts` (add Afterpay method type) |
| Modify | Zura Pay settings component (add Afterpay toggle) |
| Modify | Webhook handler (split payment completion tracking) |
| Migration | `afterpay_enabled` column + split payment tracking columns |

