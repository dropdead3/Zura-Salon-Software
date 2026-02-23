

## Fix Phorest CSV Export Job -- Correct API Parameters

### Problem
The CSV export job endpoint is already implemented but uses incorrect parameter names, which is why it returns no data (or fails silently). Phorest confirmed this is the correct endpoint for obtaining transaction/sales data.

### Root Cause
According to the [Phorest API docs](https://developer.phorest.com/reference/createcsvexportjob), the endpoint expects:
- **`startFilter`** and **`finishFilter`** (not `startDate` / `endDate`)
- Response uses **`jobStatus`** (not `status`)

Our current code at line 1051 sends `{ jobType, startDate, endDate }` -- the date filters are being silently ignored.

### Solution

**File:** `supabase/functions/sync-phorest-data/index.ts`

**1. Fix the CSV export job request body (line ~1051)**

Change:
```
{ jobType, startDate: dateFrom, endDate: dateTo }
```
To:
```
{ jobType, startFilter: dateFrom, finishFilter: dateTo }
```

**2. Fix the job status field name (line ~1094)**

Change:
```
status = (jobStatusResponse.status || jobStatusResponse.state || "").toUpperCase();
```
To:
```
status = (jobStatusResponse.jobStatus || jobStatusResponse.status || jobStatusResponse.state || "").toUpperCase();
```

**3. Add enhanced debug logging**

Log the full job creation response and first few rows of CSV data so we can verify the correct columns are being parsed. This will also confirm what fields the transactions CSV contains (client names, product/service sold, staff involved, etc. as Phorest confirmed).

**4. Update the sales sync to prioritize CSV export**

Since Phorest confirmed this is the supported method (not `/purchase/search` or `/report/sales`), reorder the fallback chain to try CSV export first, reducing unnecessary 404 errors in logs.

### What This Unlocks

Once the CSV export works correctly, the transaction data will provide:
- Client names per transaction
- Product vs service line items
- Staff involved in each sale
- Actual revenue figures for analytics
- Completed/paid appointment correlation (matching transaction dates to appointment dates)

### Files Modified
- `supabase/functions/sync-phorest-data/index.ts` -- Parameter fix, status field fix, logging, reordered fallback chain

