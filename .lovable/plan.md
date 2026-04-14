

## Three Afterpay Enhancements

### 1. Seed `payment_link` SMS Template

The `send-payment-link` edge function references `templateKey: "payment_link"` but no row exists in the `sms_templates` table. Without it, SMS delivery silently fails.

**Action:** Insert a new row into `sms_templates` via migration:
```sql
INSERT INTO public.sms_templates (template_key, name, message_body, description, variables)
VALUES (
  'payment_link',
  'Payment Link',
  'Hi {{first_name}}, here''s your {{amount}} payment link from {{salon_name}}: {{payment_url}}',
  'Sent when staff generates a payment link for in-person or Afterpay checkout',
  ARRAY['first_name', 'salon_name', 'amount', 'payment_url']
);
```

This makes the template editable per-org via the existing SMS Templates admin page.

---

### 2. Payment Link Status Indicator on AppointmentDetailSheet

Staff need visibility into whether a payment link was sent and whether it's been completed.

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

- Near the "Pay / Checkout" action buttons (line ~2140), add a status indicator that reads the appointment's `payment_link_sent_at` and `payment_link_url` fields.
- Display states:
  - **No link sent** — no indicator shown
  - **Link sent, awaiting payment** — amber badge: "Payment Link Sent · [time ago]" with a "Resend" option
  - **Split payment: terminal paid, link pending** — shows "Terminal paid · Awaiting Afterpay" 
  - **Fully paid** — green badge (already handled by existing paid_at logic)
- The indicator will query the appointment record which already has `payment_link_sent_at`, `split_payment_terminal_intent_id`, and `split_payment_link_intent_id` columns from the earlier migration.

**File:** `src/components/dashboard/schedule/CheckoutSummarySheet.tsx`

- Add a "Send Payment Link" button alongside the existing Card/Cash/Other payment method selector (line ~756) as a 4th option when the org has `afterpay_enabled`.
- When selected, the existing `SendToPayButton` component handles the flow (including split logic for amounts over $4,000).

---

### 3. "Pay in 4" Promotional Badge on Public Booking Surface (Phase 2 marker)

Add a small informational badge on the booking payment step when Afterpay is available.

**File:** `src/components/booking-surface/HostedBookingPage.tsx` (or the payment step component within it)

- When the org has `afterpay_enabled` and the deposit/amount is within the $1–$4,000 range, show a subtle badge: "Pay in 4 interest-free installments with Afterpay" with the Afterpay logo.
- This is cosmetic — the PaymentElement already renders Afterpay as an option. This just adds upfront visibility before the client reaches the payment form.

---

### Technical Details

| Action | File |
|--------|------|
| Migration | Seed `payment_link` row into `sms_templates` |
| Modify | `AppointmentDetailSheet.tsx` — add payment link status indicator |
| Modify | `CheckoutSummarySheet.tsx` — add "Send Payment Link" as 4th payment method |
| Modify | Booking surface payment step — add Afterpay promotional badge |
| Query | Fetch `afterpay_enabled` from org record (already available in org context) |

All three changes are additive — no existing flows are modified.

