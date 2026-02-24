

## Analytics Gaps to Fix

### 1. Per-Stylist Retail Attachment Rate (Same Root Cause)

**File: `src/hooks/useIndividualStaffReport.ts` (lines 322-348)**

The individual staff report calculates retail attachment rate by matching `transaction_id` between service and product rows -- the exact same bug we just fixed in the global hooks. Since Phorest uses separate transaction IDs for services and products, this always produces 0%.

**Fix:** Replace `transaction_id`-based Sets with `phorest_client_id|transaction_date` composite keys:
- Update the query on line 232 to also select `phorest_client_id`
- Build service and product Sets using `${phorest_client_id}|${transaction_date}` instead of `transaction_id`
- Match on composite keys instead of transaction IDs

---

### 2. Rebooking Rate Missing Pagination

**File: `src/hooks/useRebookingRate.ts`**

This hook fetches all completed appointments for a date range with no pagination. The default query limit is 1,000 rows. For busy salons or longer date ranges (e.g., 90 days), this silently truncates results, producing an inaccurate rebooking rate.

**Fix:** Add manual pagination using `.range()` in 1,000-row batches (same pattern used in the retail attachment hooks). Accumulate all rows before calculating the rate.

---

### 3. Individual Staff Report Missing Pagination

**File: `src/hooks/useIndividualStaffReport.ts` (line 230)**

The transaction items query for a single stylist has no pagination. High-volume stylists with more than 1,000 transaction items in the period will have truncated data, affecting revenue totals, product counts, and attachment rates.

**Fix:** Wrap the transaction items fetch in a paginated loop using `.range()` in batches of 1,000.

---

### What Does NOT Need Fixing

- **`useRetailAttachmentRate.ts`** -- Already fixed (client+date matching with pagination)
- **`useServiceRetailAttachment.ts`** -- Already fixed
- **`useStylistAddonAttachment.ts`** -- Uses a different data source (`booking_addon_events`), not affected by the transaction_id issue
- **`useRebookingRate.ts` logic** -- The rebooking logic itself (checking `rebooked_at_checkout`) is correct; only the pagination is missing

### Technical Details

All pagination will follow the established `fetchAllPages` pattern: fetch in batches of 1,000 using `.range(offset, offset + 999)`, continue until a batch returns fewer than 1,000 rows.

