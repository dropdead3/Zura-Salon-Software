

# Zura Pay → Scheduler Checkout Integration

## Current State

The checkout flow today is **payment-blind**: clicking "Complete" in the `CheckoutSummarySheet` just marks the appointment as completed in the database. No money actually moves through Stripe. The `terminal-reader-display` edge function exists with all four Stripe Terminal actions (`set_reader_display`, `process_payment`, `clear_reader_display`, `cancel_action`), but nothing in the frontend calls it. There is also no edge function to create a `PaymentIntent` for in-person terminal collection.

## What Needs to Be Built

### Layer 1: Edge Function — `create-terminal-payment-intent`
Creates a Stripe `PaymentIntent` with `payment_method_types: ['card_present']` and `capture_method: 'automatic'` scoped to the org's Connected Account. Accepts the checkout total (in cents), currency, appointment metadata, and optional tip. Returns the `payment_intent_id` and `client_secret`.

### Layer 2: Frontend Hook — `useTerminalCheckoutFlow`
Orchestrates the full terminal payment lifecycle:
1. **Create PaymentIntent** → calls `create-terminal-payment-intent`
2. **Push cart to reader** → calls `terminal-reader-display` with `set_reader_display` action (line items, tax, total)
3. **Process payment** → calls `terminal-reader-display` with `process_payment` action
4. **Poll for completion** → polls reader status until payment succeeds, fails, or times out
5. **Clear display** → calls `terminal-reader-display` with `clear_reader_display` on success or cancel
6. **Cancel** → calls `cancel_action` if the user aborts mid-tap

Exposes state: `idle | creating_intent | displaying_cart | awaiting_tap | processing | succeeded | failed | cancelled`.

### Layer 3: Reader Selection
Add a small hook `useActiveTerminalReader` that queries the org's registered readers (from `terminal_readers` or via Stripe list) and lets the front desk pick which reader to use. Default to the reader assigned to the current location. Persist selection in localStorage per location.

### Layer 4: CheckoutSummarySheet Integration
- Add a **payment method selector** above the "Complete" button: `Card (Reader)` | `Cash` | `Other` (manual/external)
- When `Card (Reader)` is selected and a reader is available:
  - "Complete" button becomes **"Charge [amount]"**
  - On click: run `useTerminalCheckoutFlow` → show inline status (Sending to reader → Waiting for tap → Processing → Done)
  - On success: auto-call `onConfirm` with payment metadata
  - On failure: show error, allow retry or switch to Cash/Other
- When `Cash` or `Other` is selected: behave exactly as today (just mark completed)
- Show a small reader indicator (reader name + connection status) when Card is selected

### Layer 5: Schedule.tsx Updates
- Pass `organizationId` and `locationId` to `CheckoutSummarySheet` (already partially done)
- Store payment method and `stripe_payment_intent_id` in the appointment completion call
- Update `handleCheckoutConfirm` to accept and persist payment metadata

## Files

| File | Action |
|------|--------|
| `supabase/functions/create-terminal-payment-intent/index.ts` | **New** — Create PI for card_present collection on Connected Account |
| `src/hooks/useTerminalCheckoutFlow.ts` | **New** — Orchestrates create PI → display → process → poll → clear |
| `src/hooks/useActiveTerminalReader.ts` | **New** — Query and select active reader for current location |
| `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` | **Modify** — Add payment method selector, reader status, charge flow |
| `src/pages/dashboard/Schedule.tsx` | **Modify** — Pass location context, persist payment metadata |
| `supabase/functions/terminal-reader-display/index.ts` | **Modify** — Add `check_reader_status` action for polling |

## Not in Scope (Future)
- Split payments (partial card + partial cash)
- Tipping on the reader screen (tip stays in the app for now)
- Refund flow from the scheduler
- Offline/fallback payment collection

1 new edge function, 2 new hooks, 0 migrations, 0 new dependencies.

