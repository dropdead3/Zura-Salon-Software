

## Gap Analysis: Parts & Labor Billing in Zura Dock

### Critical Gap 1: Dock Session Completion Does NOT Calculate Charges

**The biggest gap.** When a Dock user completes a mix session via `useCompleteDockSession`, it only updates the session status and emits an event. It does **NOT** call `useCalculateOverageCharge` — the hook that actually computes both allowance overage AND parts-and-labor product cost charges and writes them to `checkout_usage_charges`.

Compare:
- **Admin Backroom** (`MixSessionManager.tsx` line 255): calls `calculateOverage.mutate()` after session completion ✅
- **Dock** (`DockServicesTab.tsx` line 246): calls `completeSession.mutate()` only — **no charge calculation** ❌

This means **zero charges flow to checkout** for any Dock-completed session, regardless of billing mode.

**Fix:** After `completeSession.mutate()` succeeds in `DockServicesTab.tsx`, call `useCalculateOverageCharge` with `sessionId`, `appointmentId`, `organizationId`, and critically `serviceId`. This requires resolving the service ID (see Gap 2).

### Critical Gap 2: Dock Has No `serviceId` for Charge Lookup

`useCalculateOverageCharge` requires `serviceId` to look up the `service_allowance_policies` row. The Dock's `DockServicesTab` has `appointment.service_name` but **no `service_id`**. The `DockAppointment` type likely doesn't carry a resolved `service_id` from the platform's `services` table.

**Fix:** Either:
- Resolve `service_id` from `service_name` using the existing `useServiceLookup` hook (already imported in DockServicesTab)
- Or add `service_id` to the Dock appointment data model when it syncs from Phorest/scheduler

### Critical Gap 3: Dock Inventory Depletion Missing

`MixSessionManager` calls `depleteInventory.mutateAsync()` before charge calculation. The Dock's `useCompleteDockSession` does **not** deplete inventory. This means stock levels won't update for Dock-completed sessions.

**Fix:** Add `useDepleteMixSession` call to the Dock completion chain in `DockServicesTab`, before charge calculation.

### Gap 4: `useDockCompleteAppointment` Fallback Charge Path is Fragile

The `useDockCompleteAppointment` hook (appointment-level completion, not session-level) has its own charge insertion logic (lines 40–80) that:
- Doesn't check `billing_mode` — always writes overage-style charges
- Uses `charge_amount: 0` with a comment "Will be refined by full billing calc" — but nothing refines it
- Doesn't handle the `parts_and_labor` path at all

This is a secondary path (appointment swipe-to-complete), but it produces broken charge records for P&L services.

**Fix:** Either remove the inline charge insertion from `useDockCompleteAppointment` (since session-level completion should handle it), or add proper billing mode branching.

### Gap 5: No Dock Checkout Surface for Charges

The `CheckoutSummarySheet` (admin scheduler) renders product cost charges via `useCheckoutUsageCharges`. The Dock has **no checkout sheet** — it completes appointments via swipe gesture. There's no surface for Dock staff to see, approve, or communicate P&L charges to clients.

**Suggestion:** This may be intentional (charges flow to the front desk POS), but if Dock users need charge visibility, a lightweight "Charges Summary" panel in the `DockSessionCompleteSheet` would be needed.

### Gap 6: `backroom_billing_settings` Table May Not Exist

Both `useCalculateOverageCharge` (line 172) and `useEstimatedProductCharge` (line 66) query `backroom_billing_settings` for `default_product_markup_pct`. This table is cast as `any`, suggesting it may not be in the schema yet. If it doesn't exist, P&L charges would silently use 0% markup (wholesale cost = retail price).

**Verify:** Check if this table exists. If not, create it or fall back to product-level `markup_pct`.

---

### Recommended Implementation Order

1. **Wire charge calculation into Dock session completion** (`DockServicesTab.tsx` + `useDockSessionComplete.ts`) — this is the blocking gap
2. **Resolve serviceId in Dock** via `useServiceLookup` — required for step 1
3. **Add inventory depletion to Dock completion chain** — data integrity
4. **Clean up `useDockCompleteAppointment`** inline charge logic — remove duplicate/broken path
5. **Verify `backroom_billing_settings` table** — ensure markup is correctly sourced
6. *(Optional)* Add charge visibility to `DockSessionCompleteSheet`

### Scope
- 3–4 files modified
- 1 possible database migration (if `backroom_billing_settings` doesn't exist)
- No breaking changes to existing admin-side flow

