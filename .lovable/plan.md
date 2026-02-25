

## Prevent Soft-Deleted Appointments from Being Resurrected by Phorest Sync

Good structural guardrail request. The sync engine currently does a blind `upsert` on `phorest_id`, which means any appointment a manager soft-deleted locally (`deleted_at` set) gets overwritten and resurrected on the next sync cycle. This violates the principle that local operational decisions (deletions) take precedence over external sync data.

### Root Cause

In `supabase/functions/sync-phorest-data/index.ts` (lines 413-415), the appointment sync loop calls:

```typescript
await supabase
  .from("phorest_appointments")
  .upsert(appointmentRecord, { onConflict: 'phorest_id' });
```

This overwrites all fields on conflict, including clearing `deleted_at` back to `null` because the incoming record doesn't include it.

### Fix

Before the upsert loop processes each appointment, query for existing soft-deleted `phorest_id` values in the sync date range and skip them entirely.

**File:** `supabase/functions/sync-phorest-data/index.ts`

1. **Pre-fetch soft-deleted IDs** (insert before line 299): Query `phorest_appointments` for all records in the sync date range where `deleted_at IS NOT NULL`, collecting their `phorest_id` values into a `Set`.

2. **Skip deleted records in the loop** (insert at line 306, before the existing null-ID check): If the incoming `phorestId` is in the deleted set, log a skip message and `continue`.

### Technical Detail

```typescript
// Before the upsert loop (around line 299)
const { data: deletedAppointments } = await supabase
  .from("phorest_appointments")
  .select("phorest_id")
  .not("deleted_at", "is", null)
  .gte("appointment_date", dateFrom)
  .lte("appointment_date", dateTo);

const deletedPhorestIds = new Set(
  deletedAppointments?.map((a: any) => a.phorest_id) || []
);
console.log(`Found ${deletedPhorestIds.size} soft-deleted appointments to protect`);

// Inside the loop, after phorestId is resolved (around line 309)
if (deletedPhorestIds.has(phorestId)) {
  console.log(`Skipping soft-deleted appointment ${phorestId}`);
  continue;
}
```

### Scope

Single file edit in one edge function. Approximately 15 lines added. No schema changes, no new dependencies. The query runs once before the loop, so it adds one DB round-trip per sync cycle rather than one per appointment.

