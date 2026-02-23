

## Fix Sales Sync Frequency, CSV Export, and Missing Financial Data

### Issues Found

**1. Sales sync is HOURLY, not every 5 minutes**
The cron schedule for sales is `0 * * * *` (once per hour at the top of the hour). The UI text "Auto-syncs every 5 minutes" is misleading -- that only applies to appointments. The last sales sync at :00 is correct behavior for the hourly schedule.

**2. Sales sync returns 0 records -- CSV export is silently failing**
Out of 1,563 sales sync log entries, zero have ever returned any records. The CSV export function was just fixed with the correct parameters, but we need to verify it's actually working. The sync is marked "success" with 0 records, which means all four fallback methods are failing but the error is being swallowed.

**3. No tip data anywhere**
All 534 appointments show `tip_amount: 0.00`. The Phorest appointment endpoint does not include tips -- tips come from the transaction/CSV data, which isn't working yet. Once the CSV export is functional, we need to parse and store tip data.

**4. Missing columns in transaction tables**
The `phorest_transaction_items` table has no `tax_amount` or `tip_amount` columns. The `phorest_sales_transactions` table has `tax_amount` but no `tip_amount`. Tips need to be captured when the CSV export starts returning data.

---

### Plan

**Step 1: Increase sales sync frequency to every 5 minutes**
Update the cron schedule from `0 * * * *` to `*/5 * * * *` to match what the UI promises. Also remove the duplicate cron jobs (there are two sets: `sync-phorest-*` and `phorest-*-sync`).

**Step 2: Debug the CSV export in real-time**
Trigger a manual sales sync and check the logs to see exactly where the CSV export is failing. Add better error surfacing so failed CSV exports don't report "success with 0 records."

**Step 3: Add tip_amount columns**
- Add `tip_amount` column to `phorest_sales_transactions`
- Add `tax_amount` and `tip_amount` columns to `phorest_transaction_items`

**Step 4: Update CSV parser to capture tips and tax**
The CSV parser already looks for `tax` and `discount` columns but not `tip`. Add tip column mapping:
```
const idxTip = getIndex(['tip', 'tipamount', 'gratuity']);
```
And pass it through to the transaction record.

**Step 5: Fix the "success with 0 records" false positive**
When all sales endpoints return 0 records, the sync still logs as "success." It should log as "warning" or include metadata indicating no data was retrieved so the UI can show a proper status.

**Step 6: Backfill tip data to appointments**
Once CSV transactions are flowing, add logic to match transaction records back to appointments by date + staff + client to populate `tip_amount` on the `phorest_appointments` table.

---

### Technical Details

**Cron cleanup (database migration):**
- Delete duplicate jobs: `phorest-sales-sync`, `phorest-appointments-sync`, `phorest-full-sync`, `phorest-services-sync`
- Update `sync-phorest-sales-hourly` schedule from `0 * * * *` to `*/5 * * * *` and rename to `sync-phorest-sales-5min`

**Database migration for new columns:**
```sql
ALTER TABLE phorest_sales_transactions ADD COLUMN IF NOT EXISTS tip_amount NUMERIC DEFAULT 0;
ALTER TABLE phorest_transaction_items ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE phorest_transaction_items ADD COLUMN IF NOT EXISTS tip_amount NUMERIC DEFAULT 0;
```

**Edge function changes (`supabase/functions/sync-phorest-data/index.ts`):**
- Add `tip` to CSV parser column mapping
- Include `tip_amount` in transaction record upserts
- Change sales sync logging: if all endpoints return 0, log status as `no_data` instead of `success`
- Add appointment tip backfill: after syncing transactions, update matching appointments with tip amounts

**Files Modified:**
- `supabase/functions/sync-phorest-data/index.ts` -- CSV parser tip column, transaction records, tip backfill logic, improved logging
- Database migration -- New columns, cron schedule fix, duplicate job cleanup
