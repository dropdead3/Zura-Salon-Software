

## Fix Sales Sync Frequency, CSV Export, and Missing Financial Data

### Completed ✅

1. **Sales sync frequency updated to every 5 minutes** — Cron schedule changed from `0 * * * *` to `*/5 * * * *`
2. **Duplicate cron jobs cleaned up** — Removed `phorest-sales-sync`, `phorest-appointments-sync`, `phorest-full-sync`, `phorest-services-sync`
3. **tip_amount and tax_amount columns added** — Migration applied to `phorest_sales_transactions` and `phorest_transaction_items`
4. **CSV parser updated** — Now captures tip column from CSV data
5. **Transaction item records** — Now include `tip_amount` and `tax_amount` fields
6. **Sales sync logging improved** — Logs `no_data` status instead of `success` when 0 records retrieved
7. **Tip backfill logic added** — After syncing transactions, matches tips back to appointments
8. **US endpoint support added** — All Phorest API calls now fall back to `platform-us.phorest.com` (fixes 302 redirects)
9. **CSV export parameter fix** — Uses `startFilter`/`finishFilter` instead of `startDate`/`endDate`
10. **Download URL fix** — Uses `tempCsvExternalUrl` (pre-signed S3 URL) from job status response instead of constructing `/download` path (which returned 404)
11. **Zero-row optimization** — Skips download when `totalRows: 0` to avoid unnecessary S3 fetches

### Current Status ✅

CSV export pipeline is now fully functional:
- Job creation works on US endpoint
- Status polling correctly reads `jobStatus` field
- Download uses `tempCsvExternalUrl` (S3 pre-signed URL)
- Zero-row results skip download gracefully
- Today returned `totalRows: 0` (expected — Sunday, no transactions)

### Next Verification

Trigger a sync on a business day with known transactions to confirm CSV data flows through parsing → upsert → tip backfill pipeline.
