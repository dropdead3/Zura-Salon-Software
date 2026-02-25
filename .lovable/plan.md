

## Transaction-Based Completion Detection

Good instinct here -- you're identifying that the status field from Phorest doesn't always reflect reality. The sync already handles one case (past appointments auto-marked completed), but appointments paid out in Phorest mid-day stay "booked" until the next sync.

---

### What the Data Shows

- The sync function (line 405-411) already auto-marks past `booked` appointments as `completed` based on end time
- `phorest_transaction_items` links to appointments via `phorest_client_id` + `transaction_date` (the `appointment_id` column exists but is never populated -- 0 out of 30 rows)
- Today (02/25) has no transactions yet -- they lag behind, with the latest being 02/24
- Yesterday's data confirms the join works: appointments with matching transactions were already `completed`

### The Core Problem

Phorest's API returns `activationState: "ACTIVE"` for appointments even after they've been checked out. The transaction data arrives later via CSV export sync. So there's a window where an appointment has been paid but still shows `booked`.

### Recommended Approach: Enhance Transaction Sync to Reconcile Statuses

When the transaction sync runs and finds transaction items for a given `phorest_client_id` + `transaction_date`, update any matching `phorest_appointments` that are still `booked` to `completed`.

#### 1. Add status reconciliation to the sync function

**File:** `supabase/functions/sync-phorest-data/index.ts`

After the transaction items are saved (around line 1611), add a reconciliation step:

```typescript
// After saving transaction items, reconcile appointment statuses
// If a client has transactions on a date, their appointment should be completed
const uniqueClientDates = [...new Set(
  savedTransactions.map(t => `${t.phorest_client_id}|${t.transaction_date}`)
)];

for (const key of uniqueClientDates) {
  const [clientId, txDate] = key.split('|');
  if (!clientId || !txDate) continue;
  
  await supabase
    .from('phorest_appointments')
    .update({ status: 'completed' })
    .eq('phorest_client_id', clientId)
    .eq('appointment_date', txDate)
    .in('status', ['booked', 'confirmed', 'checked_in']);
}
```

#### 2. Add a visual indicator in the Appointments Hub (today view)

Since transactions don't exist for today yet, add a subtle "Transaction found" badge on appointments that DO have matching transaction data. This helps front desk staff identify which ones were actually checked out in POS.

**File:** `src/hooks/useAppointmentsHub.ts`

After the existing enrichment queries, add a batch query to check for matching transactions:

```typescript
// Check which appointments have matching transactions
const clientDatePairs = paged
  .filter(a => a.phorest_client_id && a.appointment_date)
  .map(a => a.phorest_client_id);

let transactionClientIds = new Set<string>();
if (clientDatePairs.length > 0) {
  const dates = [...new Set(paged.map(a => a.appointment_date))];
  const { data: txMatches } = await supabase
    .from('phorest_transaction_items')
    .select('phorest_client_id')
    .in('phorest_client_id', [...new Set(clientDatePairs)])
    .in('transaction_date', dates);
  
  txMatches?.forEach(t => transactionClientIds.add(t.phorest_client_id));
}
```

Then in the enrichment map, add `has_transaction: transactionClientIds.has(a.phorest_client_id)`.

#### 3. In the table row, show a "Paid in POS" indicator

When `has_transaction === true` and `status === 'booked'`, show a small indicator next to the status badge suggesting this appointment was actually completed in the POS system.

---

### Why Not Just Auto-Mark Today's Appointments?

Today's transactions haven't synced yet. The reconciliation in the sync function handles historical data correctly. For today, the front desk workflow (Check In → Complete → Pay) is the intended path. Forcing "completed" based on transaction data that doesn't exist yet would be misleading.

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/sync-phorest-data/index.ts` | Add post-transaction-sync status reconciliation |
| `src/hooks/useAppointmentsHub.ts` | Add transaction-match enrichment query |
| `src/components/dashboard/appointments-hub/AppointmentsList.tsx` | Show "Paid in POS" indicator for matched appointments |

