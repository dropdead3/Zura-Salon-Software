
## Fix Phorest CSV Column Mapping and Revenue Data Pipeline

### Root Cause

The CSV export is working -- data downloads successfully from Phorest's S3 URLs. However, the `getIndex()` function in the CSV parser uses **bi-directional `includes` matching**, which causes critical false matches against the 100+ column Phorest CSV headers.

**Current wrong mappings (from logs):**

| Field | Expected Column | Actual Match (Index) | Why |
|---|---|---|---|
| `amount` | `nettotalamount` (61) | `purchaseonlinediscountamount` (11) | "amount" includes/is-included-in both; index 11 wins first |
| `name` | `description` (18) or `productname` (31) | `branchname` (1) | "name" includes/is-included-in "branchname"; index 1 wins first |
| `tax` | `taxamount` (66) | `taxrate` (58) | "tax" matches "taxrate" first |
| `tip` | `stafftips` (67) | correct by luck | Only one match |

This explains every symptom:
- **$0 revenue**: `purchaseonlinediscountamount` is almost always 0
- **Branch name as product name**: "Drop Dead Hair Studio (Val Vista Lakes)" instead of "Balayage" or "Olaplex"
- **Wrong tax**: Tax rate (e.g., 8.3%) stored instead of tax dollar amount
- **16 units showing but $0 revenue**: Units/quantity column (19) mapped correctly; revenue column did not

### Additional Issue: Scheduled Sync Only Queries Today

The 5-minute cron job uses `quick: true`, which sets `salesFrom = salesTo = todayStr`. Since today is a Sunday with no sales, the CSV export returns 0 rows every time. The existing data from the manual 30-day sync is already in the database but has $0 amounts due to the column mapping bug above.

### Plan

**Step 1: Rewrite `getIndex()` with exact-match-first strategy**

Replace the loose bi-directional `includes` matching with a priority-based approach:
1. Exact match first (normalized header === normalized search term)
2. Starts-with match second (header starts with search term)
3. Falls back to contains only if no better match exists

This prevents "amount" from matching "purchaseonlinediscountamount" before "totalamount."

**Step 2: Use Phorest-specific column names for critical fields**

Rather than relying on generic terms like "amount" and "name," use the exact Phorest CSV column names discovered from the logs:

```text
amount -> ['nettotalamount', 'totalamount', 'netprice', 'grossprice']
name   -> ['description', 'servicename', 'productname']
tax    -> ['taxamount']
tip    -> ['stafftips', 'phoresttips']
unit   -> ['unitprice']
discount -> ['discountamount', 'simplediscountamount']
```

**Step 3: Fix `saveTransactionItems` total_amount calculation**

Currently: `total_amount = (item.price || 0) * (item.quantity || 1) - (item.discount || 0)`

This is wrong because the CSV already provides the computed `nettotalamount`. Use the parsed total directly instead of re-deriving it.

**Step 4: Clear corrupted data and re-sync**

After deploying the fixed parser:
- Truncate `phorest_transaction_items` (all 121 rows have $0 totals and wrong item names)
- Truncate `phorest_sales_transactions` (all 80 rows have $0 totals)
- Truncate `phorest_daily_sales_summary` (derived from the above, also $0)
- Trigger a full manual sync with the 30-day range to repopulate with correct data

**Step 5: Fix sync status indicator for "no sales yet"**

Update `PhorestSyncPopout` and `LastSyncIndicator` to treat `no_data` status as a neutral state displaying "No sales yet" instead of an error.

**Step 6: Fix scheduled sync to use a meaningful date range**

The `quick: true` mode only syncs today's date, but yesterday's sales may finalize after midnight. Change quick mode to sync the last 2 days (`today - 1` to `today`) instead of just today.

---

### Technical Details

**Files modified:**

1. `supabase/functions/sync-phorest-data/index.ts`
   - Rewrite `getIndex()` with exact-first matching priority
   - Update column name arrays for `idxAmount`, `idxName`, `idxTax`, `idxTip`, `idxDiscount`, `idxUnitPrice`
   - Add `idxServiceName` and `idxProductName` for proper item naming
   - Fix `saveTransactionItems` to use parsed total directly
   - Update quick-mode date range from `today-only` to `yesterday+today`

2. `src/components/dashboard/PhorestSyncPopout.tsx`
   - Treat `no_data` status as neutral with "No sales yet" label

3. `src/components/dashboard/sales/LastSyncIndicator.tsx`
   - Treat `no_data` status as a neutral indicator

**Database operations (data cleanup via insert tool, not migration):**
- `DELETE FROM phorest_transaction_items` (all rows are corrupt)
- `DELETE FROM phorest_sales_transactions` (all rows are corrupt)
- `DELETE FROM phorest_daily_sales_summary` (all rows are corrupt)
