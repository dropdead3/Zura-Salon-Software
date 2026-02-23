

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

### Remaining Issue 🔧

**CSV export download returns 404** — The job creates successfully on the US endpoint (`jobStatus: DONE`), but the download endpoint (`/csvexportjob/{jobId}/download`) returns 404 on both EU and US base URLs. Possible causes:
- The download endpoint path may differ from creation/status endpoint
- The job may need a longer wait before download is available
- The download may require a different URL format (e.g., a `downloadUrl` field in the job status response)

**Next step:** Check the Phorest API docs for the exact download URL format, or inspect the full job status response for a `downloadUrl` or `fileUrl` field that contains the direct download link.
