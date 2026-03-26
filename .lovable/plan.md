

## Enhance Allowance Health — Suggested Price, Cost Breakdown Tooltip, Persist Status

### Overview
Three enhancements to the health indicator in the Allowance Calculator footer: a one-click "Suggested Price" action when status is `high`, a tooltip showing wholesale vs. retail cost breakdown on the health badge, and persisting the health status to the `service_allowance_policies` table for dashboard reporting.

### 1. Database Migration

Add columns to `service_allowance_policies`:
- `allowance_health_status` (text, nullable) — stores `'healthy'`, `'high'`, or `'low'`
- `allowance_health_pct` (numeric, nullable) — the computed percentage
- `last_health_check_at` (timestamptz, nullable) — when the health was last evaluated

### 2. Update `AllowanceCalculatorDialog.tsx`

**Suggested Price button (when status is `high`):**
- Below the health message, render a small ghost button: "Use $X suggested price"
- On click, call a mutation to update the service's `price` (base price) to `healthResult.suggestedServicePrice`
- After update, invalidate service queries so the new price reflects immediately
- The health indicator will recalculate on re-render with the new price

**Cost breakdown tooltip on health badge:**
- Wrap the health percentage badge in a `Tooltip`
- Tooltip content shows:
  - Wholesale cost: sum of all line costs at wholesale rates
  - Markup applied: the delta between wholesale and retail totals
  - Retail (after-markup) cost: the current `grandTotal`
  - Service price and target range
- Requires tracking `wholesaleGrandTotal` alongside `grandTotal` in the existing computation

**Persist health status on save:**
- In `handleSave`, after upserting the allowance policy, also update the policy record with `allowance_health_status`, `allowance_health_pct`, and `last_health_check_at`
- Uses the existing `useUpsertAllowancePolicy` mutation (extend the payload)

### 3. Update `useServiceAllowancePolicies.ts`

- Add the three new fields to the `ServiceAllowancePolicy` interface
- Include them in the upsert mutation payload type

### 4. Compute Wholesale Total

In the existing bowl computation logic, add a parallel `wholesaleGrandTotal` that sums line costs using the original `getWholesaleCostPerGram` (already available) instead of the retail rate. This is only used for the tooltip breakdown display.

### Files Summary

| File | Action |
|------|--------|
| Database migration | Add `allowance_health_status`, `allowance_health_pct`, `last_health_check_at` to `service_allowance_policies` |
| `AllowanceCalculatorDialog.tsx` | Add suggested price button, cost breakdown tooltip, persist health on save, track wholesale total |
| `useServiceAllowancePolicies.ts` | Extend interface and mutation with health fields |

