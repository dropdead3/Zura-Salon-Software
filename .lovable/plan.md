

# Pre-Tax / Tax-Inclusive Revenue Toggle

## Approach

Rather than refactoring 40+ files to change their revenue formulas, we'll create a **Revenue Display Context** that wraps all revenue values at the display layer — similar to how `HideNumbersContext` wraps values for privacy. Revenue hooks continue computing tax-inclusive totals (the POS source of truth), and the context subtracts tax when pre-tax mode is active.

## Architecture

```text
┌──────────────────────────────────────────┐
│  site_settings: 'revenue_display_mode'   │
│  { mode: 'inclusive' | 'exclusive' }     │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│  RevenueDisplayContext (React Context)   │
│  - revenueMode: 'inclusive' | 'exclusive'│
│  - toggleRevenueMode()                   │
│  - adjustRevenue(gross, tax) → display   │
└──────────────┬───────────────────────────┘
               │
   Used by AggregateSalesCard, KPI tiles,
   Staff Reports, Comparison cards, etc.
```

## Implementation Plan

### Task 1 — Create `RevenueDisplayContext`
New file `src/contexts/RevenueDisplayContext.tsx`:
- Reads org setting from `site_settings` key `revenue_display_mode` via `useSiteSettings`
- Exposes `revenueMode`, `toggleRevenueMode()`, and `adjustRevenue(grossAmount, taxAmount)` helper
- `adjustRevenue` returns `grossAmount - taxAmount` when mode is `'exclusive'`, otherwise returns `grossAmount`
- Persists toggle via `useUpdateSiteSetting`
- Provider wraps the dashboard (add to existing provider tree)

### Task 2 — Add toggle to Settings UI
Add a "Revenue Display" toggle in the organization settings area:
- Simple switch: "Show revenue as tax-inclusive" / "Show revenue pre-tax (excludes sales tax)"
- Uses `toggleRevenueMode()` from context

### Task 3 — Update `useTaxSummary` to export tax amounts alongside revenue hooks
Ensure the tax summary hook's data is accessible where needed. Most revenue hooks already query `tax_amount` — we just need to ensure the display components have both `gross` and `tax` values available to pass to `adjustRevenue()`.

### Task 4 — Update key revenue display surfaces
Apply `adjustRevenue()` in the highest-impact surfaces:
- **AggregateSalesCard** — hero revenue display, service/product breakdowns
- **Sales KPI tiles** — total revenue, service revenue, product revenue
- **Individual Staff Report** — revenue KPIs
- **Comparison cards** — period A/B revenue
- **Transactions page** — summary stat

Each surface already has both `total_amount` and `tax_amount` available in their hooks. The change is wrapping the displayed value: `adjustRevenue(totalRevenue, totalTax)`.

### Task 5 — Update label dynamically
Change the "Excludes Tips · Incl. Tax" label in AggregateSalesCard to reflect the current mode:
- Inclusive: "Excludes Tips · Incl. Tax"
- Exclusive: "Excludes Tips · Excl. Tax"

Similarly update MetricInfoTooltip descriptions.

## Key Design Decisions

- **No formula changes in hooks** — hooks continue computing tax-inclusive totals (POS truth). The context adjusts at display time only.
- **Org-level persistence** — stored in `site_settings`, same pattern as other org preferences.
- **Gradual rollout** — start with the 5 highest-impact surfaces. Lower-traffic surfaces can be updated incrementally.
- **Default: inclusive** — matches current behavior. No breaking change for existing orgs.

## Files

| Action | File |
|--------|------|
| Create | `src/contexts/RevenueDisplayContext.tsx` |
| Create | `src/hooks/useRevenueDisplayMode.ts` (thin hook wrapping context) |
| Edit | `src/components/dashboard/AggregateSalesCard.tsx` (hero + label) |
| Edit | `src/components/dashboard/reports/IndividualStaffReport.tsx` (KPIs) |
| Edit | `src/components/dashboard/sales/compare/ComparisonResultsGrid.tsx` |
| Edit | `src/pages/dashboard/Transactions.tsx` (summary stat) |
| Edit | Settings UI (add toggle — exact file TBD based on settings layout) |
| Edit | Provider tree (wrap dashboard with `RevenueDisplayProvider`) |

No database changes — uses existing `site_settings` table.

