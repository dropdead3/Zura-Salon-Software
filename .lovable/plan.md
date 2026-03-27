

## Gap Analysis: Service Tracking, Pricing & Dock Billing — Pass 8

### Bug 1 (Low): Leftover `as any` Cast on `charge_type` in DockServicesTab

Line 644 of `DockServicesTab.tsx`:
```ts
chargeType: (c as any).charge_type === 'product_cost' ? ...
```
`charge_type` is now on the `CheckoutUsageCharge` interface (added in Pass 7). The `as any` cast is unnecessary and should be removed to `c.charge_type`.

**Fix:** Remove `as any` cast — one line change.

---

### Gap 2 (Medium): Pre-Completion Charge Estimate Still Missing

The `DockSessionCompleteSheet` shows `pendingCharges` from `existingCharges` — but charges only exist *after* the completion chain runs. On first open, the charges section is always empty. The user taps "Complete" blind.

An `useEstimatedProductCharge` hook already exists and is used in the booking wizard. It computes estimates from `service_recipe_baselines` + `products.cost_per_gram` for parts-and-labor services.

**Fix:** In `DockServicesTab`, when `existingCharges` is empty and `sessionStats?.totalCost > 0`, compute an inline estimate:
- For P&L services: use `sessionStats.totalCost` × `(1 + backroom_billing_settings.default_product_markup_pct / 100)`
- For allowance services: use `sessionStats.totalNetUsage` vs the policy's `included_allowance_qty` to show "Within allowance" or "~Xg over allowance"

Pass an `estimatedCharges` prop to `DockSessionCompleteSheet` when `pendingCharges` is empty. Show it with a "~" prefix and muted styling to differentiate from actual charges.

**Files:** `DockServicesTab.tsx`, `DockSessionCompleteSheet.tsx`

---

### Gap 3 (Medium): Completion Error Recovery — Partial State Corruption

The `handleCompleteSession` try/catch catches errors but provides no recovery path. If `completeSession.mutateAsync` succeeds but `depleteInventory.mutateAsync` fails, the session is stuck in `completed` status with undepleted inventory. The chain cannot be retried.

**Fix:** Restructure the completion chain so that `completeSession` is called *last* (after depletion and charge calculation succeed). This way, if depletion fails, the session stays in its active state and can be retried. The order becomes:
1. Deplete inventory
2. Calculate charges
3. Mark session completed (only if 1+2 succeed)

Update the error toast to show which step failed.

**File:** `DockServicesTab.tsx`

---

### Gap 4 (Low): `DockSessionCompleteSheet` Doesn't Reset State on Reopen

When the sheet closes and reopens, `notes` and `unresolvedReason` retain their previous values because `useState` persists across mount cycles (the component stays mounted, just hidden via `open` prop).

**Fix:** Add a `useEffect` that resets `notes`, `unresolvedReason`, and `mode` when `open` transitions from `false` to `true`.

**File:** `DockSessionCompleteSheet.tsx`

---

### Gap 5 (Low): Checkout Summary Receipt PDF Missing Overage Line Items

The PDF receipt generator in `CheckoutSummarySheet.tsx` (line 313–341) prints product cost charges individually but only prints overage charges as a single lump sum ("Additional Product Usage: $X.XX"). For transparency, overage charges should list individual service names like product charges do.

**Fix:** Add per-service overage line items to the PDF, matching the product cost pattern.

**File:** `CheckoutSummarySheet.tsx`

---

### Implementation Order

1. **Reorder completion chain** (deplete → charge → complete) — Gap 3
2. **Pre-completion charge estimate** — Gap 2
3. **Sheet state reset on reopen** — Gap 4
4. **Remove leftover `as any`** — Bug 1
5. **Overage receipt line items** — Gap 5

### Scope
- 3 files modified: `DockServicesTab.tsx`, `DockSessionCompleteSheet.tsx`, `CheckoutSummarySheet.tsx`
- No database migrations
- No breaking changes

