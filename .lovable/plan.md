

## Fix: Wire product data into the Products by Stylist drilldown

**Problem**: `useServiceProductDrilldown` hardcodes `productRevenue: 0` for every staff member. The product data already exists in `phorest_transaction_items` (3 rows today totaling $175.45) — it just isn't queried.

**No Phorest reports API call needed.** The sync is already populating the data correctly.

### File: `src/hooks/useServiceProductDrilldown.ts`

1. **Add a second query** to `phorest_transaction_items` inside the existing `queryFn`, filtering by the same date range and location, where `item_type IN ('product', 'Product', 'retail', 'Retail', 'PRODUCT', 'RETAIL')`.
2. **Select**: `phorest_staff_id, total_amount, tax_amount, item_name`.
3. **Aggregate product data by staff**: sum `(total_amount + tax_amount)` per `phorest_staff_id`, count items.
4. **Merge into `staffMap`**: for each staff member, set `productRevenue`, `productCount`, and compute `retailToServiceRatio` = `productRevenue / serviceRevenue` (when > 0).
5. **Compute `totalProductRevenue`** from the product aggregation and return it (replacing the hardcoded `0`).
6. **Compute `sharePercent`** per staff: `staffProductRevenue / totalProductRevenue * 100`.
7. **Ensure staff who sold products but had no appointments still appear** in the result set (merge keys from both maps).

### Technical detail

```text
Existing:  phorest_appointments → serviceRevenue per staff
Missing:   phorest_transaction_items (product rows) → productRevenue per staff
Merge:     union of staff IDs from both sources
```

### Files changed
- `src/hooks/useServiceProductDrilldown.ts` — add product query from `phorest_transaction_items`, merge into staff aggregation

