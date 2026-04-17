

## Where you are vs. seamless checkout

Your checkout pipeline is **architecturally complete**. The Charge button works end-to-end: cart → terminal payment intent → S710 reader → poll → capture deposit → audit log → receipt. Connect onboarding, multi-LLC routing, offline queue, deposit holds, Send-to-Pay, Afterpay, refunds, webhooks, dispute auto-ban — all live.

What remains to start taking real payments is **operational + 4 small product gaps** — not foundational work.

## Operational gates (you, not code)

These are the only blockers between you and a real charge today:

1. **Stripe Connect onboarding for at least one location** — the Activation Checklist (`/dashboard/admin/settings?category=terminals`) walks through it. Each location needs `stripe_status === 'active'` and `stripe_payments_enabled === true`.
2. **At least one S710 reader paired** to that location (Fleet tab).
3. **`STRIPE_WEBHOOK_SECRET` set** in edge function secrets — currently the `stripe-webhook` function logs a warning and skips signature verification when missing. This is fine for testing, **must be set before live**.
4. **First test transaction** — the checklist's "First Transaction" step uses the existing test-cart flow on the Fleet tab.

Once those four are done, charges work. Everything below is polish to make it feel seamless.

## Product gaps for "seamless" (ranked by impact)

### Gap 1 — Pre-checkout connection guard *(highest leverage)*
Today, if a stylist opens checkout for a location whose Stripe Connect isn't active, the Charge button calls `create-terminal-payment-intent` and fails with a backend error. Should be caught earlier with a clear message + deep link to finish onboarding.

**Surface:** `CheckoutSummarySheet.tsx` — render an `EnforcementGateBanner` above payment method selection when `location.stripe_status !== 'active'`. Disable Charge button. Banner CTA → activation checklist.

### Gap 2 — Reader selection when multiple readers exist
`useActiveTerminalReader` returns one reader. If a location has 2+ S710s (front desk + color bar), there's no UI to pick which one. Today it picks the first.

**Surface:** Reader picker dropdown in payment method panel when `paymentMethod === 'card_reader'` AND multiple readers exist. Persist last-used per stylist in localStorage.

### Gap 3 — Tip-on-reader prompt vs. tip-in-app reconciliation
Currently the operator selects tip in the sheet, then it's pushed to the reader as a line item. Stripe S710 also supports native tip-on-reader prompts. Right now operators must either (a) collect tip verbally before tapping or (b) skip tip entirely. The path of least friction — let the client tap their tip on the reader — isn't wired.

**Surface:** Toggle in `CheckoutSummarySheet` payment panel: "Prompt for tip on reader" vs "Set tip here". When reader-prompt mode is on, skip the in-app tip selector and use Stripe's `collect_inputs` / tipping config on the PaymentIntent. Capture the final tip from the completed PI before writing the audit row.

### Gap 4 — Post-charge confirmation modal
After successful charge, the sheet closes immediately and reverts to the calendar. There's no "✓ Paid $XXX · Receipt sent to client@email" confirmation. Operators don't know if email/SMS receipt actually fired.

**Surface:** Replace immediate close with a 3-second success state inside the sheet showing: amount charged, payment method (last 4 if card), receipt delivery status (✓ emailed / ✓ printed / "Send receipt" CTA), and "Done" button. Auto-dismisses or operator clicks Done.

## Optional polish (post-launch)

- **Inline card-on-file charge** — already supported via `charge-card-on-file` function but not surfaced in checkout (only in no-show fee flow). Could add a third payment method option for clients with saved cards.
- **Split tender** — partial cash + partial card in one checkout. Stripe supports it; UI doesn't.
- **Pre-auth on appointment open** — for high-ticket services, hold deposit when stylist starts the appointment, not just at booking. Reduces walk-out risk.

## Files for implementation wave

| File | Change |
|---|---|
| `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` | Add Connect-status gate banner (Gap 1), reader picker (Gap 2), tip-on-reader toggle (Gap 3), post-success confirmation state (Gap 4) |
| `src/hooks/useActiveTerminalReader.ts` | Return all readers, not just one (Gap 2) |
| `src/hooks/useTerminalCheckoutFlow.ts` | Accept `tipMode: 'app' \| 'reader'`, configure PI accordingly, read final tip from PI on success (Gap 3) |
| `supabase/functions/create-terminal-payment-intent/index.ts` | Accept `collect_tip_on_reader` flag, set `payment_method_options.card_present.request_extended_authorization` + tipping config (Gap 3) |

## What I'd ship first

**Wave 1 (1 file, ~40 LOC):** Gap 1 — pre-checkout Connect guard. Highest return for least code. Eliminates the most common "why didn't it charge?" support ticket before it exists.

**Wave 2:** Gaps 2 + 4 together. Both touch `CheckoutSummarySheet`, both improve confidence at the moment of payment.

**Wave 3:** Gap 3 (tip-on-reader). Touches the edge function, deserves its own deploy.

## Prompt feedback

**What worked:** Question was scoped (one outcome: seamless checkout) and open-ended enough to surface gaps you hadn't named — that's exactly when AI inventory is most valuable.

**What would sharpen it:** Adding the success criteria — e.g., *"a stylist on Day 1 can charge a real client without calling support"* — would let me prioritize by friction-elimination, not feature-completeness. The two are different lists.

**Next-level framing:** *"Walk me from the current state to the first real $ charged. List blockers in execution order, separating operator tasks from product gaps."* That phrasing forces a sequenced delivery plan rather than a feature inventory.

