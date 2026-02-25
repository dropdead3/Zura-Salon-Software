

## Diagnosis: Why Phorest Shows 801 Appointments but Zura Only Has 586

### Root Cause: Pagination Not Handled in Appointment Sync

The `sync-phorest-data` edge function fetches appointments from the Phorest API using:

```
/branch/{branchId}/appointment?from_date=...&to_date=...
```

The latest sync log shows: **"Found 20 appointments in branch Drop Dead Hair Studio (North Mesa)"** and **"Found 20 appointments in branch Drop Dead Hair Studio (Val Vista Lakes)"** -- exactly 20 per branch.

The Phorest API returns **paginated results with a default page size of 20**. The sync function never fetches page 2, 3, etc. It takes whatever the first API response returns and stops. Over multiple daily syncs (each fetching only the first 20 per branch), records accumulate -- but each sync window only captures a fraction of the actual appointments.

This is why we have 586 instead of 801. Each day's sync grabbed the first 20 appointments per branch for the date range, missing any beyond page 1.

### Secondary Issue: Multi-Service Appointments

Line 424 in the sync function: `service_name: apt.services?.[0]?.name` -- only the first service is stored. If Phorest returns separate appointment objects per service line item (which the report's "801" count suggests), some may share the same `appointmentId` and get deduplicated by the upsert on `phorest_id`. This could also contribute to the count gap.

### Revenue Gap ($88,996 vs $65,055)

The ~$24K revenue gap follows directly from the missing ~215 appointments. Those appointments have revenue that was never synced.

### Fix Plan

**1. Add pagination to `syncAppointments`** (lines 241-267 in `sync-phorest-data/index.ts`)

The Phorest API uses `page` and `size` parameters (or `_links.next` for HATEOAS pagination). The fix:

```typescript
// Current (broken):
const appointmentsData = await phorestRequest(
  `/branch/${branchId}/appointment?from_date=${dateFrom}&to_date=${dateTo}`,
  ...
);
const appointments = appointmentsData._embedded?.appointments || ...;

// Fixed (paginated):
let page = 0;
let hasMore = true;
while (hasMore) {
  const appointmentsData = await phorestRequest(
    `/branch/${branchId}/appointment?from_date=${dateFrom}&to_date=${dateTo}&size=100&page=${page}`,
    ...
  );
  const appointments = appointmentsData._embedded?.appointments || ...;
  // ... add to allAppointments
  
  // Check if more pages exist
  const totalPages = appointmentsData.page?.totalPages || 1;
  page++;
  hasMore = page < totalPages;
}
```

**2. Handle multi-service appointments**

Instead of storing only `services[0]`, if the Phorest API returns multiple services within a single appointment object, each service should either:
- Be stored as a separate row (with a composite `phorest_id + service_index` key), or
- Have the service details stored in a related table

This needs investigation of the actual API response structure first. A pragmatic first step: log the `services` array length on the first appointment to determine if this is happening.

**3. After deploying the fix, run a full re-sync**

Trigger a sync with the full date range (`2026-01-23` to `2026-03-04`) to backfill the missing appointments. The upsert on `phorest_id` ensures existing records are updated, not duplicated.

**4. Verify counts match Phorest**

After re-sync, compare appointment count and total revenue against the Phorest report to confirm parity.

### Technical Details

**Files Changed:**
1. `supabase/functions/sync-phorest-data/index.ts` -- Add pagination loop in `syncAppointments` function (lines ~241-267), add logging for multi-service detection

**Risk:** Low. The upsert on `phorest_id` makes this idempotent. Existing records will be updated; new records will be inserted.

**Also affects:** The same pagination issue likely exists in the sales/transaction sync functions within this file. Those should be audited and fixed in the same pass.

