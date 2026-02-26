

## Root Cause: Tax Amount Not Included in Revenue Totals

**The problem**: Phorest reports **$175.45** (tax-inclusive). Zura reports **$162.00** (tax-exclusive). The `phorest_transaction_items` table stores `total_amount` (pre-tax) and `tax_amount` separately. Every revenue calculation in the codebase sums only `total_amount`, missing the `tax_amount` column entirely.

Breakdown from today's 3 transactions:
- `total_amount`: $72 + $74 + $16 = **$162.00**
- `tax_amount`: $5.98 + $6.14 + $1.33 = **$13.45**
- Phorest total (tax-inclusive): **$175.45** ✓

## Plan

### 1. Add tax to the fallback query in `useTodayActualRevenue.ts`

Both fallback queries (lines ~87-121 and ~189-230) currently select only `total_amount`. Change them to also select `tax_amount` and add it to each line item's amount:

```typescript
const amount = (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0);
```

This affects:
- The main `actualRevenueQuery` fallback (product revenue for today)
- The `locationActualRevenueQuery` fallback (by-location breakdown)

### 2. Add tax to `useSalesData.ts` — the primary analytics hook

This hook powers Sales Overview, Top Performers, and all analytics cards. Two key query sites:

- **`useSalesOverview`** (line ~262): The transaction items query selects `total_amount, item_type, tip_amount` — add `tax_amount` to the select and include it in the product revenue sum.
- **`useSalesByStylist`** (line ~402): Same pattern — add `tax_amount` and include it when summing `total_amount` per staff member.

### 3. Verify `phorest_daily_sales_summary` values

Check whether the `total_revenue`, `service_revenue`, and `product_revenue` columns in `phorest_daily_sales_summary` already include tax (set by the sync edge function). If they do, only the transaction-item fallback paths need fixing. If they don't, the sync function also needs updating.

### Files changed
- `src/hooks/useTodayActualRevenue.ts` — add `tax_amount` to both fallback queries
- `src/hooks/useSalesData.ts` — add `tax_amount` to `useSalesOverview` and `useSalesByStylist` transaction item sums

### Technical note
This aligns retail revenue with Phorest's default "Exclude Tax: No" view (tax-inclusive). Service revenue in `phorest_appointments.total_price` is already tax-inclusive per POS convention, so only transaction item queries need the fix.

