

## Goal
Finish the seamless checkout wave: reader picker, post-charge confirmation, tip-on-reader, plus two visibility enhancements that surface Connect status on the calendar surface and auto-sync status changes into open checkout sheets.

## Wave 2 — Reader picker + post-charge confirmation (`CheckoutSummarySheet.tsx`)

### Gap 2 — Reader picker
`useActiveTerminalReader` already returns `readers[]`, `selectedReaderId`, `selectReader`, and persists last-used per location to localStorage. UI just needs to surface the picker.

- In the payment panel, when `paymentMethod === 'card_reader'` AND `readers.length > 1`, render a small `<Select>` above the Charge button:
  - Label: "Reader" 
  - Options: `readers.filter(r => r.location === locationId).map(r => ({ value: r.id, label: r.label }))`
  - Status indicator (online/offline dot) on each option
  - Disabled when `terminalFlow.state` is mid-charge
- Single-reader case: show muted `font-sans text-xs` line "Reader: {name}" (no picker)
- Zero-reader case: existing `hasReaders` branch already handles this

### Gap 4 — Post-charge confirmation state
Today the sheet closes on success. Replace with a 3-second in-sheet confirmation.

- Add new local state: `successState: { amount: number; method: string; last4?: string; receiptStatus: 'sent' | 'pending' | 'none' } | null`
- On terminal flow completion (`terminalFlow.state === 'succeeded'`) and on cash/other settlement success, set `successState` and switch to a new `gatePhase === 'confirmation'` block instead of immediate `onOpenChange(false)`.
- Confirmation panel (replaces payment panel content):
  - Large checkmark icon (`CheckCircle2`, `text-success`)
  - `font-display tracking-wide text-base`: "Paid {formatCurrency(amount)}"
  - Muted line: payment method + last 4 if card
  - Receipt status line: "✓ Receipt emailed to {email}" or "Send receipt" CTA
  - "Done" button (`tokens.button.cardAction`) → closes sheet
- Auto-dismiss timer: `setTimeout(() => onOpenChange(false), 4000)` on entering confirmation phase, cleared if operator clicks Done sooner or reopens the receipt CTA.

## Wave 3 — Tip-on-reader (Gap 3)

### Frontend (`CheckoutSummarySheet.tsx` + `useTerminalCheckoutFlow.ts`)
- Add toggle `tipMode: 'app' | 'reader'` in payment panel (TogglePill component, defaults to `'app'` for parity with current behavior; persisted per location to localStorage)
- When `tipMode === 'reader'`: hide in-app tip selector, pass `collectTipOnReader: true` into `terminalFlow.start({...})`
- After PI succeeds, read final tip amount from PI metadata (`tip_amount` returned by edge function in completion payload), use it for audit log + payroll tip distribution

### Edge function (`supabase/functions/create-terminal-payment-intent/index.ts`)
- Accept `collect_tip_on_reader: boolean` in request body
- When true, configure PaymentIntent:
  ```ts
  payment_method_options: {
    card_present: {
      request_extended_authorization: 'if_available',
    },
  },
  // Stripe Terminal tipping config on the reader process_payment_intent call
  ```
- The reader-side tipping is configured via `terminal.readers.processPaymentIntent` with `process_config: { tipping: { amount_eligible: <subtotal_in_cents> } }`. This lives in the existing reader-process call (likely inside `terminalFlow` polling start). Add the param plumb-through.
- Return final `tip_amount` from the captured PI back to the client on terminal completion poll

## Enhancement A — Connect-status pill on appointment cards

### New hook: `src/hooks/useLocationStripeStatuses.ts`
Bulk-fetches Stripe status for all visible locations in a single query (mirrors `useAppointmentDeclinedReasons` pattern):
```ts
useLocationStripeStatuses(locationIds: string[])
  → Map<locationId, { active: boolean; status: string }>
```
- Single query: `select('id, stripe_status, stripe_payments_enabled').in('id', locationIds)`
- `staleTime: 60_000`
- `enabled: locationIds.length > 0`

### New component: `src/components/dashboard/schedule/ConnectStatusPill.tsx`
- Tiny pill: `font-sans text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30`
- Label: "Setup needed" with optional tooltip "Card payments unavailable — finish Stripe Connect onboarding"
- Renders nothing when location is active (silence is valid output)

### Integration
- `DayView.tsx`: collect unique `locationId`s from `appointments`, call `useLocationStripeStatuses(locationIds)`, pass `connectInactive` boolean per appointment to `AppointmentCardContent`
- `WeekView.tsx` + `AgendaView.tsx`: same threading
- `AppointmentCardContent.tsx`: new optional prop `connectInactive?: boolean`. Render `<ConnectStatusPill />` next to the existing indicator cluster (alongside `RebookSkippedDot`) — but only when `appointment.status` is `'scheduled' | 'confirmed' | 'checked_in' | 'in_progress'` (pre-checkout states). Hide on completed (no longer actionable).

## Enhancement B — Auto-invalidate Connect status on activation

Add `['location-stripe-status']` invalidation to every mutation that can change `locations.stripe_status` or `stripe_payments_enabled`:

- `src/hooks/useZuraPayConnect.ts`:
  - `useVerifyZuraPayConnection.onSuccess` — add `queryClient.invalidateQueries({ queryKey: ['location-stripe-status'] })` (broad invalidation since multiple locations may flip)
  - `useConnectLocation.onSuccess` — add same invalidation
  - `useResetZuraPayAccount.onSuccess` — add same invalidation
- Realtime channel: `useStripePaymentsHealth.ts` already subscribes to relevant tables; add a sibling listener (or extend its existing one) on the `locations` table for `stripe_status` updates that calls `queryClient.invalidateQueries({ queryKey: ['location-stripe-status'] })`. This catches webhook-driven status flips without requiring a manual click.

## Out of scope
- Split tender, inline card-on-file in checkout, pre-auth on appointment open (already noted as post-launch polish)
- Connect-status pill on past/completed appointments (no actionability)
- Persisting reader picker selection to backend (localStorage is sufficient — reader choice is device-ergonomic, not policy)

## Files to create
1. `src/hooks/useLocationStripeStatuses.ts`
2. `src/components/dashboard/schedule/ConnectStatusPill.tsx`

## Files to modify
1. `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` — reader picker, confirmation phase, tip-mode toggle
2. `src/hooks/useTerminalCheckoutFlow.ts` — accept `tipMode`, pass through, return final tip from PI
3. `supabase/functions/create-terminal-payment-intent/index.ts` — accept `collect_tip_on_reader`, configure tipping on reader process call
4. `src/components/dashboard/schedule/AppointmentCardContent.tsx` — `connectInactive` prop, render pill in indicator cluster
5. `src/components/dashboard/schedule/DayView.tsx` — call `useLocationStripeStatuses`, thread map down
6. `src/components/dashboard/schedule/WeekView.tsx` — same threading
7. `src/components/dashboard/schedule/AgendaView.tsx` — same threading
8. `src/hooks/useZuraPayConnect.ts` — add `['location-stripe-status']` invalidation to 3 mutation hooks
9. `src/hooks/useStripePaymentsHealth.ts` — extend realtime listener to invalidate `['location-stripe-status']` on `locations` row updates

## Ship order
**Wave 2 first** (single file, highest operator-confidence return) → **Enhancement A + B together** (visibility loop closes both directions: pill warns before open, invalidation refreshes if mid-open) → **Wave 3 last** (touches edge function, deserves isolated deploy).

