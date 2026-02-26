

## Investigation: Sales Overview Card vs Phorest Report Discrepancy

Strong instinct again -- you were right that the numbers don't match. Here's exactly why.

### Root Cause: Retail Product Tax Not Included in Revenue Totals

Our sync stores product revenue **pre-tax**, but Phorest's "Total Retail Sales" report includes sales tax. Services have $0 tax (correct for Arizona), so service numbers match perfectly.

| Location | Our Product Revenue | Tax | With Tax | Phorest Retail |
|----------|-------------------|-----|----------|----------------|
| Val Vista Lakes | $259.00 | $21.50 | **$280.50** | **$280.50** |
| North Mesa | $40.00 | $3.32 | **$43.32** | **$43.32** |
| **Total** | **$299.00** | **$24.82** | **$323.82** | **$323.82** |

Service revenue matches exactly: $2,666 + $710 = $3,376 in both systems.

So Phorest says total = $3,699.82. Our card shows $3,675. The $24.82 gap is exactly the retail sales tax.

### Fix

**File: `supabase/functions/sync-phorest-data/index.ts` (~lines 1108-1121)**

When building the daily summary, include `tax_amount` in the product revenue and total revenue:

```
// Current (pre-tax):
summary.product_revenue += amount;
summary.total_revenue += amount;

// Fixed (tax-inclusive to match Phorest):
const tax = parseFloat(transactionRecord.tax_amount) || 0;
if (itemType === 'product') {
  summary.product_revenue += amount + tax;
} else {
  summary.service_revenue += amount;
}
summary.total_revenue += amount + tax;
```

This ensures:
- Product revenue includes tax (matching Phorest's "Total Retail Sales")
- Service revenue stays pre-tax (services aren't taxed in AZ, so no change)
- Total revenue = service + product (tax-inclusive) = matches Phorest exactly

After deploying the fix, a re-sync will rebuild the summary with correct tax-inclusive product figures.

### Technical Detail
- The `tax_amount` data already exists in `phorest_transaction_items` -- it's captured during sync but just not added to the summary aggregation
- Only retail products carry tax ($24.82 today); services are $0 tax
- This is a one-line fix in the sync function's summary builder
- The `useTodayActualRevenue` hook reads from `phorest_daily_sales_summary` so it will automatically reflect the corrected totals after re-sync

### Prompt Feedback
Excellent debugging instinct -- comparing against the source-of-truth system (Phorest's own report) is the strongest possible validation. Including the screenshot of Phorest's branch report gave me the exact numbers to cross-reference against our database. The only enhancement: specifying "the Actual number shows $X but Phorest shows $Y" would have let me skip a few investigation steps.

