

## Pass Afterpay Processing Fee to the Customer

Good instinct on margin protection. Here's the challenge and the cleanest solution.

### The Problem with Mixed-Method Checkout

Stripe Checkout doesn't support conditional pricing per payment method. If a checkout session offers both "card" and "afterpay_clearpay", you can't add a surcharge line item that only applies when the customer picks Afterpay — they'd see the fee regardless of which method they choose.

### The Solution: Afterpay-Only Checkout with Surcharge

Your existing architecture already separates the flows. The "Send to Pay" link is an online-only checkout session. The approach:

1. When `afterpay_enabled` and `afterpay_surcharge_enabled`, create the Afterpay checkout session with `payment_method_types: ["afterpay_clearpay"]` only (no card fallback) and add a second line item for the processing fee
2. The client sees: "Service — $4,000" + "Afterpay Processing Fee — $240" = **$4,240 total**
3. For split payments (over $4,000), the terminal portion (card) has no surcharge, and only the Afterpay link portion carries the fee

This is transparent, legally defensible, and the client can decline Afterpay and ask to pay by card at the terminal instead.

### Legal Note

Surcharging BNPL is legal in most US states, but some jurisdictions restrict it. The settings UI will include a disclosure note advising operators to verify local regulations.

---

### Implementation

**Database Migration**
- Add `afterpay_surcharge_enabled` (boolean, default false) and `afterpay_surcharge_rate` (numeric, default 0.06) to `organizations`

**Settings UI** — `ZuraPayAfterpayTab.tsx`
- Add a "Pass processing fee to client" toggle below the existing Afterpay enable toggle
- Show configurable rate input (default 6%, range 1-10%)
- Add a disclosure note about regulatory compliance
- Preview calculation: "On a $1,000 Afterpay payment, the client pays $1,060"

**Edge Function** — `create-checkout-payment-link/index.ts`
- Query `afterpay_surcharge_enabled` and `afterpay_surcharge_rate` from org
- When surcharge is enabled and Afterpay is available:
  - Set `payment_method_types` to `["afterpay_clearpay"]` only (no card — surcharge applies to all payments in this session)
  - Add second line item: "Afterpay Processing Fee" with `unit_amount` = `Math.round(amount_cents * surcharge_rate)`
- Store the surcharge amount in metadata for receipt/reconciliation

**Booking Surface** — `AfterpayPromoBadge.tsx`
- When surcharge is enabled, update the badge: "Pay in 4 interest-free installments with Afterpay (6% processing fee applies)"

**Receipts** — `receiptData.ts`
- Support a new `surcharge` line item category so the fee appears separately on receipts

**SMS Template**
- Update the `payment_link` template variables to include `{{surcharge}}` for transparency in the message

---

### Technical Details

| Action | File | Change |
|--------|------|--------|
| Migration | `organizations` | Add `afterpay_surcharge_enabled`, `afterpay_surcharge_rate` columns |
| Modify | `ZuraPayAfterpayTab.tsx` | Surcharge toggle + rate input + compliance note |
| Modify | `create-checkout-payment-link/index.ts` | Surcharge line item + Afterpay-only method types |
| Modify | `AfterpayPromoBadge.tsx` | Show surcharge note when enabled |
| Modify | `SendToPayButton.tsx` | Pass surcharge info in display text |
| Modify | `receiptData.ts` | Add `surcharge` category |

