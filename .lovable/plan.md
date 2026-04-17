

## Prompt review

Direct, scope-setting prompt — and the screenshot shows the exact surface (in-drawer Quick Actions row, Send Payment Link button). Even sharper next time: distinguish "what staff sees" vs "what the client sees" up front. Your context answer (front desk + terminal) tells me you're solving for **staff orchestrating Afterpay**, not clients self-checking-out. That reframes "checkout UI" — it's a staff handoff surface, not a public storefront.

## Plan — Wave 19: Afterpay + Checkout Staff Handoff UI

**Doctrine anchor:** `payments/afterpay-and-split-payment-system` + `payments/point-of-sale-terminal-checkout-integration`.

### Context reframe

You picked all four surfaces but the primary context is **front desk → terminal**. That means:
- Staff drives everything from the dashboard
- Afterpay is a *fallback* (split overflow >$4k, OR client wants installments)
- Public-facing pages (checkout link, receipt) are infrastructure that the link points to — staff doesn't see them

Wave 19 focuses on **the in-drawer staff handoff** (highest leverage, fastest impact). Public checkout page + branded receipt page are scoped as **Wave 20** (deferred with explicit trigger).

### What's wrong now (from screenshot + code audit)

| # | Finding | Pri |
|---|---|---|
| 1 | "Send Payment Link" in Quick Actions is opaque — staff can't tell what client will see (Card vs Afterpay vs both, with/without surcharge) before sending | **P0** |
| 2 | Afterpay flow only triggers from `SendToPayButton` deep in the drawer footer — no visibility from Quick Actions row | **P0** |
| 3 | When total > $4k, `SplitPaymentDialog` opens but staff has no in-drawer **summary** of the split they just sent (Afterpay link sent for $X, terminal still owes $Y) | **P0** |
| 4 | Surcharge preview (`CheckoutSummarySheet` ~L823-848) is buried in the checkout footer — staff doesn't see it from the appointment drawer Quick Actions | **P1** |
| 5 | No "link sent" status reflected in the appointment drawer — staff has to refresh / cross-reference Transactions tab to confirm delivery | **P1** |
| 6 | No way to **resend** or **cancel** an active payment link from the drawer if client lost SMS or changed mind | **P1** |
| 7 | Public checkout page is Stripe-hosted (no branding, no salon logo, no Afterpay education for first-time users) | **P2** (Wave 20) |
| 8 | Receipt is HTML email + print — no branded post-payment confirmation page client can revisit | **P2** (Wave 20) |

### Wave 19 implementation

**Fix #1 — Send Payment Link composer modal (new):**

New component: `src/components/dashboard/appointments/SendPaymentLinkComposer.tsx`

Replaces the direct-fire from `SendToPayButton`. When staff clicks "Send Payment Link" in Quick Actions:
- Opens a focused composer (not a heavy dialog — `PremiumFloatingPanel` for consistency with drawer)
- **Preview card** shows exactly what client will see:
  - Service name + amount
  - Payment options client will have: "Card" badge always; "Afterpay (Pay in 4)" badge when `orgAfterpayEnabled && total ≤ $4000`; "Afterpay only" badge when surcharge enabled
  - Surcharge breakdown if applicable (use existing logic from CheckoutSummarySheet L823-848 — extract into shared component `<AfterpaySurchargePreview />`)
  - Installment preview: "$X.XX every 2 weeks" (4 installments)
- **Delivery channel selector**: SMS / Email / Both (auto-detected from available client data, staff can override)
- **Optional message** textarea (prepended to default body — passed via `send-payment-link` edge function)
- **Send** button → fires existing `create-checkout-payment-link` + `send-payment-link` chain, then advances to "sent" state inside the composer

**Fix #2 — Quick Actions: visual hierarchy for Afterpay-eligible amounts:**

In `AppointmentDetailSheet.tsx` Quick Actions row:
- When `orgAfterpayEnabled && total ≤ $4000`: button label becomes **"Send Payment Link · Afterpay"** with the existing AfterpayLogo icon next to Send icon
- When `total > $4000` && Afterpay enabled: label is **"Send Payment Link · Split"** to telegraph the split flow
- When Afterpay disabled or total ineligible: stays plain "Send Payment Link"
- All variants open the same composer (composer adapts to context)

**Fix #3 — Active payment link status block (new in drawer):**

When the appointment has `payment_link_status = 'sent' | 'viewed' | 'paid'` (already tracked per `PaymentLinkStatusBadge`):
- New section above Quick Actions: **"Payment Link Active"** card showing:
  - Status timeline (Sent → Viewed → Paid) using existing `PaymentLinkStatusBadge` styling
  - Channel sent (SMS to ###-###-####, Email to xxx@yyy.com)
  - Amount + surcharge breakdown
  - **Resend** button (re-fires `send-payment-link` with same checkout_url)
  - **Cancel link** button (marks status `cancelled`, voids checkout session via new edge function update)
  - **View receipt** link if paid (opens existing TransactionDetailSheet)

**Fix #4 — Split payment summary card (after split sent):**

Modify `SplitPaymentDialog.tsx` to NOT just show "Done" — instead:
- After link sent, dialog closes AND a persistent banner appears in the appointment drawer:
  - **"Split payment in progress"** card with two rows:
    - ✓ Afterpay link sent for $X.XX (link to status block)
    - ⏱ Pending terminal payment: $Y.YY (CTA: "Charge on terminal" → opens CheckoutSummarySheet pre-filled with remainder)
- Drives staff to complete the in-person half without ambiguity

**Fix #5 — Shared component extraction:**

New: `src/components/dashboard/payments/AfterpaySurchargePreview.tsx`
- Pulls the surcharge math currently inlined in CheckoutSummarySheet L823-848
- Reusable in: composer preview, drawer status block, CheckoutSummarySheet footer
- Prop: `amountCents`, `surchargeRate`, `compact?: boolean`

### Files to create / modify

**New:**
- `src/components/dashboard/appointments/SendPaymentLinkComposer.tsx`
- `src/components/dashboard/payments/AfterpaySurchargePreview.tsx`
- `src/components/dashboard/appointments/PaymentLinkStatusCard.tsx` (drawer status block)

**Modify:**
- `src/components/dashboard/appointments/SendToPayButton.tsx` — open composer instead of firing directly; keep prop API
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — Quick Actions label adapts to Afterpay context; mount PaymentLinkStatusCard above Quick Actions
- `src/components/dashboard/appointments/SplitPaymentDialog.tsx` — replace "Done" success state with in-drawer hand-off
- `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` — replace inlined surcharge preview with shared component
- `DEBUG_LOG.md` — Wave 19 entry with leverage marker

### Acceptance checks

1. Click "Send Payment Link" from Quick Actions → composer opens with full preview of what client will see (payment options, surcharge if any, installment math)
2. After send, drawer shows persistent **Payment Link Active** card with sent timestamp, channel, status; staff can resend or cancel
3. For totals > $4k, split dialog confirms then drawer shows split-pending banner directing staff to terminal for remainder
4. Quick Actions label reflects Afterpay context: "Send Payment Link · Afterpay" / "· Split" / "Send Payment Link"
5. Surcharge preview component renders identically across composer / drawer status / CheckoutSummarySheet
6. Tests still 111/111

### Deferred (Wave 20 — public surfaces)

- **P2 #7** Branded public checkout page (`/checkout/:token`) — trigger: when first non-Afterpay-eligible client complains about Stripe-hosted checkout looking generic, OR when we add salon-branding for white-label rollout
- **P2 #8** Branded receipt/confirmation page — trigger: paired with #7
- **P2** Composer "schedule send" (queue link to send at specific time, e.g., morning of appointment) — trigger: requested by ≥2 operators
- **P2** Bulk resend for stale links (24h+ unviewed) — trigger: ops requests it

