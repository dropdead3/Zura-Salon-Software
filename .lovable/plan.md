

# Fix Level Progress Revenue: Switch from Stale Summary to Transaction Items

## Root Cause

The `phorest_daily_sales_summary` table — used by both `useLevelProgress` and `useStylistPeerAverages` — stopped receiving data on **Feb 21**. It only contains 16 rows for the last 90 days for Gavin, totaling $4,674.50. The actual POS transaction data in `phorest_transaction_items` shows $10,677.50 for the same period.

This means the 30-day monthly average shows ~$1,558 instead of the correct ~$3,559.

**Fix**: Replace `phorest_daily_sales_summary` queries with `phorest_transaction_items` (which has `stylist_user_id` populated directly — no join needed). This aligns with the POS-first standard already applied to the Individual Staff Report.

## Changes

### File 1: `src/hooks/useLevelProgress.ts`

Replace the sales query (lines 132-145):
- **Current**: Queries `phorest_daily_sales_summary` by `user_id`, gets `service_revenue` and `product_revenue` per day
- **New**: Query `phorest_transaction_items` by `stylist_user_id`, selecting `total_amount, tax_amount, item_type, transaction_date`
- Paginate with `fetchAllBatched` pattern (1000-row pages) since transaction items can exceed 1000 rows

Update `computeMetrics()` (lines 234-250):
- **Current**: Sums `service_revenue` and `product_revenue` from sales summary rows
- **New**: Sum `total_amount` from transaction items, split by `item_type === 'service'` vs other
- Revenue = service + product (excluding tips, matching Phorest "Performance Revenue")

Update `computePriorMetrics()` with the same logic.

### File 2: `src/hooks/useStylistPeerAverages.ts`

Replace peer sales query (lines 64-78):
- **Current**: Queries `phorest_daily_sales_summary` for all peer `user_id`s
- **New**: Query `phorest_transaction_items` for all peer `stylist_user_id`s with pagination

Update aggregation loop (lines 146-153):
- **Current**: Iterates sales summary rows summing `service_revenue` / `product_revenue`
- **New**: Iterate transaction items, classify by `item_type`, sum `total_amount`

## Expected Result

Gavin's card will show:
- Service Revenue: ~$3,338/mo (monthly avg) instead of $1,558
- Retail Attachment and Avg Ticket will also use accurate transaction data
- All peers will use the same live data source

## Files Changed

| File | Change |
|---|---|
| `useLevelProgress.ts` | Switch sales query from `phorest_daily_sales_summary` to `phorest_transaction_items`; update `computeMetrics` aggregation |
| `useStylistPeerAverages.ts` | Same switch for peer sales data |

2 files, no database changes.

