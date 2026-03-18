

# Budget Forecasting for Procurement

Add a "Budget Forecast" section to the existing Analytics tab that projects future monthly spend based on historical patterns and flags budget overruns against a configurable monthly budget target.

## Database

**New table: `procurement_budgets`** — stores per-org monthly budget targets.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK | |
| monthly_budget | numeric | Target monthly procurement spend |
| alert_threshold_pct | integer | Default 80 — warn when spend hits this % of budget |
| updated_at | timestamptz | |
| updated_by | uuid | |

RLS: org members can read, org admins can update.

## Hook changes (`useReorderAnalytics.ts`)

Extend `ReorderAnalyticsData` with:
- `monthlyTotals: { month: string; spend: number }[]` — already derivable from existing `monthlySpendBySupplier`, just aggregate per month
- `projectedNextMonth: number` — weighted moving average of last 3 months (recent months weighted heavier)
- `projected3Months: { month: string; projected: number }[]` — next 3 months forecast
- `trendPct: number` — month-over-month trend percentage

New hook `useProcurementBudget()` in same file to read/update the budget target.

## UI changes (`ReorderAnalyticsTab.tsx`)

Add below existing KPI cards:

1. **Budget Settings** — small inline editor (pencil icon) to set monthly budget target and alert threshold
2. **Budget vs Actual card** — progress bar showing current month spend vs budget, color-coded (green < 80%, amber 80-100%, red > 100%)
3. **Forecast chart** — line chart overlaying historical monthly spend with projected 3-month forecast and a horizontal budget line
4. **Budget Alert banner** — appears when projected spend exceeds budget threshold, showing "Projected spend of $X,XXX exceeds your $Y,YYY monthly budget by Z%"

## Files

| File | Action |
|------|--------|
| Migration | Create `procurement_budgets` table with RLS |
| `useReorderAnalytics.ts` | Add monthly totals aggregation, projection logic, and `useProcurementBudget` hook |
| `ReorderAnalyticsTab.tsx` | Add budget settings, forecast chart with budget line, and overrun alert banner |

