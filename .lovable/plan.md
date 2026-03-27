

## Fix: Parts & Labor Charges Not Calculated (is_active Gap)

### The Bug

When a service is configured as "Parts & Labor" in the Service Tracking UI, the policy is saved with `is_active: false`. However, both charge calculation hooks filter for `is_active: true`:

- **`useCalculateOverageCharge.ts` line 46** — `.eq('is_active', true)` → P&L policy never found → no charge created at checkout
- **`useEstimatedProductCharge.ts` line 55** — `.eq('is_active', true)` → P&L estimate never shown in booking wizard

This means **Dock sessions for Parts & Labor services will complete with zero charges passed to the client**.

### Root Cause

`is_active` was designed for allowance mode (on = allowance enforced, off = no overage tracking). Parts & Labor policies should always be "active" — they're a different billing mode, not a deactivated allowance.

### Fix

**1. ServiceTrackingSection.tsx (line 773)** — Set `is_active: true` for both modes:

```ts
// Before
is_active: mode === 'allowance' ? (policy?.is_active ?? false) : false,

// After
is_active: mode === 'parts_and_labor' ? true : (policy?.is_active ?? false),
```

Parts & Labor policies are always active (there's no "configure later" state — the mode itself is the configuration).

**2. ServiceEditorDialog.tsx** — Same fix on save: when `billingMode === 'parts_and_labor'`, ensure the upserted policy has `is_active: true`.

**3. No changes needed** to `useCalculateOverageCharge` or `useEstimatedProductCharge` — the `is_active` filter is correct behavior (inactive = don't charge). The fix is making P&L policies active.

### Secondary: CheckoutSummarySheet label clarity

The `CheckoutSummarySheet` already renders P&L charges via `useCheckoutUsageCharges` and `CheckoutClarityPanel`, but the label says "Product Usage" generically. No functional gap — charges will flow correctly once the `is_active` fix is in place.

### Scope
- 2 files, ~2 lines changed each
- No database changes
- Fixes a silent billing failure for all Parts & Labor services

