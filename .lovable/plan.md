

## Debug Fix: Retail %, Attach Rate, Tips, and Retail Revenue

### Root Cause Analysis

There are **3 distinct bugs** causing the zeroed-out metrics on the Sales Overview:

---

### Bug 1: `useSalesMetrics` hardcodes `productRevenue: 0`

The primary data hook for the Sales Overview card (`useSalesMetrics` in `src/hooks/useSalesData.ts`) queries **only** `phorest_appointments` -- which contains no product/retail data. It explicitly returns:

```
productRevenue: 0,
totalProducts: 0,
```

Meanwhile, the `phorest_daily_sales_summary` table **does** have correct product revenue ($3,173.64 total). The fix is to enrich `useSalesMetrics` by also querying `phorest_daily_sales_summary` for product revenue within the same date range, or to replace the appointment-based approach entirely with transaction-item-based aggregation.

**Impact**: Products show $0, Retail % shows 0%, Revenue Breakdown donut is 100% services.

---

### Bug 2: Tips are stored as **negative values**

The CSV parser stores `stafftips` values directly, but Phorest exports tips as negative numbers (e.g., `-56.20`, `-117.00`). The `tip_amount` column in `phorest_transaction_items` has all negative values. Downstream, the appointment tip backfill queries `tip_amount > 0` (line 1106), which finds **zero rows**, so `phorest_appointments.tip_amount` stays `NULL`/0.

**Impact**: Tips show $0 everywhere.

---

### Bug 3: Attach Rate shows "---"

The `RevenueDonutChart` receives `retailAttachmentRate` as a prop, but `AggregateSalesCard` does **not** pass this prop to the donut chart (lines 1023-1027). The `useRetailAttachmentRate` hook is never called in the Sales Overview flow.

**Impact**: Attach Rate shows a dash instead of the actual rate.

---

### Fix Plan

**File 1: `src/hooks/useSalesData.ts` -- `useSalesMetrics` function**

- Add a parallel query to `phorest_transaction_items` to fetch product revenue and tip totals for the same date/location filters
- Product revenue: `SUM(total_amount)` where `item_type IN ('product', 'Product', 'PRODUCT')`
- Tips: `SUM(ABS(tip_amount))` from service items (take absolute value since they are stored negative)
- Merge these into the returned metrics object so `productRevenue` and `totalTips` reflect real data

**File 2: `supabase/functions/sync-phorest-data/index.ts` -- Fix negative tip storage**

- In `parseSalesCsv`, wrap the parsed tip value with `Math.abs()` so tips are stored as positive numbers
- In the appointment tip backfill logic, the `> 0` filter will then work correctly
- This fixes the data going forward; existing data needs a one-time correction

**File 3: `src/components/dashboard/AggregateSalesCard.tsx` -- Pass attachment rate to donut**

- Import and call `useRetailAttachmentRate` with the current date filters
- Pass `retailAttachmentRate` and `retailAttachmentLoading` props to the `RevenueDonutChart` component

**Database: One-time data correction**

- Run `UPDATE phorest_transaction_items SET tip_amount = ABS(tip_amount) WHERE tip_amount < 0` to fix existing negative tips
- Then re-run the appointment tip backfill by triggering a sync

---

### Technical Summary

| Issue | Root Cause | Fix Location |
|---|---|---|
| Products $0 | `useSalesMetrics` only queries appointments | `useSalesData.ts` |
| Retail % 0% | Derived from productRevenue which is 0 | Same as above |
| Attach Rate "---" | Prop not passed to RevenueDonutChart | `AggregateSalesCard.tsx` |
| Tips $0 | Stored as negative; backfill query uses `> 0` | `sync-phorest-data/index.ts` + DB fix |

