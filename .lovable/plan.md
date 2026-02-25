

## Hide Created/Created By, Add Total Paid Column

### Changes

**1. `src/hooks/useAppointmentsHub.ts`** — Enhance the transaction query to return the sum of `total_amount` per client+date pair, then add `total_paid` to the enriched data.

Currently the query only fetches `phorest_client_id` to check existence. Change it to also sum `total_amount`, keyed by `phorest_client_id|transaction_date`:

```typescript
// Instead of just selecting phorest_client_id, select with total_amount
const { data: txMatches } = await supabase
  .from('phorest_transaction_items')
  .select('phorest_client_id, transaction_date, total_amount')
  .in('phorest_client_id', phorestClientIdsForTx)
  .in('transaction_date', appointmentDates);

// Build a map: clientId|date -> total paid
const transactionTotalMap: Record<string, number> = {};
txMatches?.forEach((t: any) => {
  if (t.phorest_client_id) {
    transactionClientIds.add(t.phorest_client_id);
    const key = `${t.phorest_client_id}|${t.transaction_date}`;
    transactionTotalMap[key] = (transactionTotalMap[key] || 0) + (Number(t.total_amount) || 0);
  }
});
```

Then in the enrichment map, add:
```typescript
total_paid: a.phorest_client_id && a.appointment_date
  ? transactionTotalMap[`${a.phorest_client_id}|${a.appointment_date}`] ?? null
  : null,
```

**2. `src/components/dashboard/appointments-hub/AppointmentsList.tsx`** — Replace the two columns:

- Remove the "Created" and "Created By" `<TableHead>` entries and their corresponding `<TableCell>` rows
- Add a "Total Paid" column (right-aligned, same responsive breakpoint `hidden lg:table-cell`)
- Update `COL_COUNT` from 13 to 12
- Update the CSV export headers to replace Created/Created By with Total Paid
- Remove the two skeleton cells for those columns, add one for Total Paid
- Display with `<BlurredAmount>` for financial privacy consistency

### What Does NOT Change

- The Created At and Created By data remain visible in the **detail drawer** (Booking Provenance section) — only the table columns are removed
- The `has_transaction` flag and "Paid" badge logic remain unchanged

| File | Change |
|---|---|
| `src/hooks/useAppointmentsHub.ts` | Sum transaction amounts per client+date, add `total_paid` to enriched data |
| `src/components/dashboard/appointments-hub/AppointmentsList.tsx` | Replace Created/Created By columns with Total Paid column |

