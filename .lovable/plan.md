

## Goal
Build a checkout that mirrors how appointments actually unfold: pre-priced from catalog, then **fully editable at the register** — add/swap/remove services, apply discounts, waive fees — before settling. This is the "negotiated phase" Phorest gets right.

## Scope (two waves, shipped together)

### Wave 1 — Catalog price fallback (the $0 bug)
**File:** `src/components/dashboard/schedule/CheckoutSummarySheet.tsx`

Resolution chain when `appointment.total_price` is null/0:
1. `service_location_prices.price` (per-location override)
2. `services.price` (org default)
3. NULL → `text-warning` "Price not set" + Charge CTAs disabled

Show subtle `tokens.body` muted subtitle: `"Catalog price · POS price not yet stamped"` when falling back.

### Wave 2 — Editable line-item cart at checkout
Convert the static service summary into an editable line-item table — the heart of the negotiated phase.

**New file:** `src/hooks/useCheckoutCart.ts`
Local state cart (mirrors `useRegisterCart` pattern), seeded from the appointment's resolved services on mount. Shape per line item:
```ts
{ id, type: 'service' | 'addon' | 'product', name, staffId, unitPrice, quantity, discount: { type: 'pct'|'amt'|'waive', value, reason? }, isOriginal: boolean }
```
Methods: `addLine`, `removeLine`, `updateLine`, `applyDiscount`, `waiveLine`, `swapService`, `reset`.

**New components in `src/components/dashboard/schedule/checkout/`:**

1. `CheckoutLineItems.tsx` — editable table replacing current static service block:
   - Per-row inline controls: quantity stepper, price field (click-to-edit, audit-logged on change), staff picker (existing), discount popover, remove button
   - "Original" lines visually distinct (subtle `border-l-2 border-l-primary/40`); "Added at checkout" lines plain
   - Empty state: "Add a service to begin"

2. `AddServiceDialog.tsx` — searchable command palette over `services` (org-scoped, location price-aware). Reuses `useServices` + `useServiceLocationPrices`. Adds line as `{ type: 'service', isOriginal: false }`.

3. `LineDiscountPopover.tsx` — three modes:
   - Percent off (0–100)
   - Amount off ($)
   - **Waive** (sets price to $0, requires `reason` from a small enum: `Comp`, `Service Recovery`, `Manager Comp`, `Other`)
   - All discounts captured with `applied_by_user_id`, `reason`, timestamp → written to audit log on settle

4. `CartDiscountSection.tsx` — order-level discount (existing promo code field stays; add a manual "Manager Discount" line with reason)

**Modify:** `CheckoutSummarySheet.tsx`
- Replace static service display with `<CheckoutLineItems>`
- Subtotal, tax, total recompute from cart (not from `appointment.total_price`)
- "Add Service" button in section header → opens `AddServiceDialog`
- Diff banner when cart differs from original: `"3 changes from original appointment"` (expandable to show added/removed/repriced/discounted)

**Audit & integrity** (doctrine: commission/margin protection):
- Every price override, waive, and discount writes to `appointment_audit_log` (existing pattern from `useAppointmentAuditLog`) with: `event_type`, `previous_value`, `new_value`, `reason`, `applied_by`
- On settle, the **negotiated cart** writes to Zura-native transaction items (existing `transaction_items` schema) — these become the immutable revenue record. Phorest is never written to (`phorest-write-back-safety-gate`).
- Discount events: `LINE_PRICE_OVERRIDDEN`, `LINE_WAIVED`, `LINE_DISCOUNTED`, `SERVICE_ADDED_AT_CHECKOUT`, `SERVICE_REMOVED_AT_CHECKOUT` — added to `AUDIT_EVENTS` enum

**Permissions** (waive/override are sensitive):
- Line price override + waive gated behind `permissions.checkout.override_price` (use `usePermission` / `VisibilityGate`)
- Stylists: can add services, apply preset discounts (≤20%)
- Managers/Owners: can waive, apply unlimited discount, override prices
- Below threshold → controls hidden (silence is valid output); above threshold + no permission → disabled with tooltip "Manager approval required"

**Visual structure** (no new tokens, all existing):
- Line items use `tokens.table.columnHeader` for column labels (Title Case, `font-sans`)
- Prices wrapped in `BlurredAmount`
- Discount badges use `text-warning` for waives, muted for percentage discounts
- "Add Service" button: `tokens.button.cardAction` (pill, h-9)
- Diff banner: `border-warning/40 bg-warning/[0.06]` — uses the semantic `--warning` token already shipped

## Out of scope (logged for next wave)
- **Estimate vs final separation** in DB schema (`estimated_total` + `final_total` columns) — structurally correct but requires migration + analytics rewrite. Revisit trigger: when native scheduling ships end-to-end without Phorest dependency on booking creation.
- **Tip splitting across multiple service providers** — current tip selection assumes one stylist; multi-provider tip allocation is its own wave.
- **Refund/void flow post-settle** — separate doctrine; this wave covers pre-settle negotiation only.
- **Manager approval flow** (PIN-prompt for high-value waives over a threshold) — gating works via permissions for v1; PIN-prompt UX is a Phase 3 polish.

## Files to create
1. `src/hooks/useCheckoutCart.ts`
2. `src/components/dashboard/schedule/checkout/CheckoutLineItems.tsx`
3. `src/components/dashboard/schedule/checkout/AddServiceDialog.tsx`
4. `src/components/dashboard/schedule/checkout/LineDiscountPopover.tsx`
5. `src/components/dashboard/schedule/checkout/CartDiscountSection.tsx`

## Files to modify
1. `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` — wire cart, swap static block for `<CheckoutLineItems>`, add diff banner, recompute totals, add catalog price resolver (Wave 1)
2. `src/lib/audit-event-types.ts` — add the 5 new audit event types

