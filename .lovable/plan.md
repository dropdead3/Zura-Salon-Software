

## Fix: Resolve Client Names from Linked Tables

### Problem

Almost all appointments in both tables have `client_name` as NULL:
- **phorest_appointments**: 525 of 530 have NULL `client_name`. The actual names are in the `phorest_clients` table, linked via `phorest_client_id`.
- **local appointments**: All 127 have NULL `client_name`. They use a `client_id` foreign key instead.

Since the hub only displays `appt.client_name || 'Walk-in'`, every row shows "Walk-in."

### Fix

**File:** `src/hooks/useAppointmentsHub.ts`

After paginating results, resolve client names from `phorest_clients` for phorest appointments that have a `phorest_client_id` but no `client_name`. This follows the same pattern already used for resolving stylist names.

#### Steps:

1. Collect all `phorest_client_id` values from paged phorest appointments where `client_name` is null
2. Batch-query `phorest_clients` for those IDs to get `name`
3. Merge the resolved names into the enriched results

### Technical Detail

Add a client name resolution step between the pagination (line 77) and the stylist resolution (line 80):

```typescript
// Resolve client names for phorest appointments missing client_name
const missingClientIds = [
  ...new Set(
    paged
      .filter((a: any) => !a.client_name && a.phorest_client_id)
      .map((a: any) => a.phorest_client_id)
  ),
] as string[];

let clientNameMap: Record<string, string> = {};
if (missingClientIds.length > 0) {
  const { data: clients } = await supabase
    .from('phorest_clients')
    .select('phorest_client_id, name')
    .in('phorest_client_id', missingClientIds);
  for (const c of clients || []) {
    if (c.phorest_client_id && c.name) {
      clientNameMap[c.phorest_client_id] = c.name;
    }
  }
}
```

Then in the enrichment step, add the fallback:

```typescript
const enriched = paged.map((a: any) => ({
  ...a,
  client_name: a.client_name || clientNameMap[a.phorest_client_id] || null,
  stylist_name: stylistMap[a.stylist_user_id] || a.staff_name || null,
}));
```

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAppointmentsHub.ts` | Add client name resolution from `phorest_clients` table |

### Impact

All 525+ appointments with linked `phorest_client_id` will now display the correct client name (e.g., "Barbara Bloom") instead of "Walk-in." Only truly anonymous appointments (no client_id and no client_name) will show "Walk-in."

