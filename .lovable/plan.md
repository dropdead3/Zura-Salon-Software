

## Fix: Revenue display falls back to transaction items when daily summary is empty

**Problem**: `useTodayActualRevenue` only queries `phorest_daily_sales_summary`. When the daily aggregation hasn't synced yet, it shows $0 — even though raw transaction data exists in `phorest_transaction_items` (which is why Top Performers shows $162).

**Solution**: Add a fallback query to `phorest_transaction_items` inside `useTodayActualRevenue.ts`. When the daily summary returns no rows for today, sum revenue directly from transaction items instead.

### File: `src/hooks/useTodayActualRevenue.ts`

**Change the `actualRevenueQuery` (lines 64-92)**:

1. Keep the existing `phorest_daily_sales_summary` query as the primary source.
2. After checking `if (!data || data.length === 0)`, instead of returning zeros, query `phorest_transaction_items` for today's date:
   - Sum `total_amount` grouped by `item_type` (service vs product)
   - Count distinct `phorest_client_id` for transaction count
   - Return these as the fallback values with `hasData: true` if revenue > 0
3. Mark the result with a `source: 'summary' | 'transactions'` flag (optional, for debugging clarity).

**Same pattern for `locationActualRevenueQuery` (lines 134-160)**:
- Apply the same fallback: if `phorest_daily_sales_summary` returns no rows, query `phorest_transaction_items` grouped by `location_id`.

**Also subscribe to realtime on `phorest_transaction_items`** (lines 42-56):
- Add a second `.on()` listener for `phorest_transaction_items` table changes so the cha-ching notification fires even when the daily summary hasn't synced.

### Technical detail

```text
Primary path:   phorest_daily_sales_summary (today)
                  ↓ empty?
Fallback path:  phorest_transaction_items (today)
                  → SUM total_amount WHERE item_type = 'service'  → serviceRevenue
                  → SUM total_amount WHERE item_type = 'product'  → productRevenue
                  → COUNT DISTINCT phorest_client_id              → transactions
```

### Files changed
- `src/hooks/useTodayActualRevenue.ts` — add transaction items fallback + realtime listener

