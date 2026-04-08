

# Tax Visibility: What's Needed and Implementation Plan

## Product Analysis

You're right to flag this. In any SaaS handling financial data for operators, **tax collected is not revenue — it's a pass-through liability**. Right now, every revenue number in Zura includes tax, which means:

1. **Operators overestimate earnings** — $80,932 in March was actually revenue; the $867 in tax they collected belongs to the state
2. **No remittance visibility** — operators have no way to know how much sales tax to remit without going back to Phorest
3. **Audit risk** — if an operator reports Zura's "revenue" figures to their accountant, the tax portion is double-counted

### What serious SaaS platforms do (Square, Shopify, Toast, Boulevard):

- Show **Revenue (pre-tax)** as the primary metric
- Show **Tax Collected** as a separate line item
- Provide a **Tax Summary report** by period and location for remittance
- Some show both "Net Revenue" and "Gross (tax-inclusive)" with clear labels

### What's pragmatic for Zura right now:

Refactoring all 42 files to change the revenue formula would be a massive, risky undertaking. Instead:

**Option A (Recommended):** Add a **Tax Summary card** to Sales Analytics that shows taxes collected by period/location, and add a small "incl. tax" label to revenue figures. This gives operators remittance data without touching the revenue calculation engine.

**Option B (Future):** Eventually separate all revenue displays into "Revenue" (pre-tax) and "Tax" columns. This is a Phase 2 effort after the tax card proves valuable.

---

## Implementation Plan (Option A)

### Task 1 — Create `useTaxSummary` hook
New hook in `src/hooks/useTaxSummary.ts` that queries `phorest_transaction_items` for:
- Total tax collected in date range
- Tax by location
- Tax by item type (will only show products since services are $0)
- Tax by month (for multi-month ranges)
Uses `fetchAllBatched`, proper location scoping, and the standard patterns.

### Task 2 — Add Tax Summary card to Sales Analytics
New component `src/components/dashboard/sales/TaxSummaryCard.tsx`:
- Shows total tax collected for the selected period
- Breakdown by location (if multi-location)
- Monthly trend if range spans multiple months
- Uses `PinnableCard`, design tokens, `BlurredAmount` for privacy
- Follows canonical card header layout

### Task 3 — Add "incl. tax" indicator to key revenue displays
Add a small `text-muted-foreground` label "(incl. tax)" next to the primary revenue figure on:
- Sales Overview card
- Revenue KPI tiles
This is a 1-line label addition per surface — no formula changes.

---

## Summary

| What | Effort | Risk |
|---|---|---|
| `useTaxSummary` hook | New file | None — read-only |
| Tax Summary card | New component | None — additive |
| "incl. tax" labels | 2-3 lines each | None — cosmetic |

3 tasks, 3-4 files created/modified. No database changes. No revenue formula changes.

This gives operators the tax remittance data they need today, while preserving the option to separate pre-tax revenue in a future pass.

