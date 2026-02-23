
## Fix: Appointments Not Loading in Appointments & Transactions Hub

### Root Cause

The Appointments Hub query is failing with a **400 error** from the database. The error message:

> "Could not find a relationship between 'phorest_appointments' and 'phorest_clients' using the hint 'phorest_appointments_phorest_client_id_fkey'"

The `useAppointmentsHub` hook tries to join `phorest_clients` via a foreign key that no longer exists in the database schema. This causes every query to fail silently, showing an empty table.

### Why the Scheduler Still Works

The scheduler queries `phorest_appointments` directly without joining `phorest_clients`. It uses the `client_name` field stored directly on the appointment row -- which is already populated. The hub query tries an unnecessary join that breaks everything.

### Fix

**File:** `src/hooks/useAppointmentsHub.ts` (line 23-24)

Remove the `phorest_clients` join from the select statement. The `client_name` field is already stored directly on `phorest_appointments`, so the join is redundant.

Before:
```
.select('*, phorest_clients!phorest_appointments_phorest_client_id_fkey(name, email, phone)', { count: 'exact' })
```

After:
```
.select('*', { count: 'exact' })
```

Also update the table row rendering in `AppointmentsList.tsx` (line 227) to remove the fallback to `appt.phorest_clients?.name` since that join data will no longer be available:

Before:
```
{appt.client_name || appt.phorest_clients?.name || 'Walk-in'}
```

After:
```
{appt.client_name || 'Walk-in'}
```

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAppointmentsHub.ts` | Remove broken `phorest_clients` join from select |
| `src/components/dashboard/appointments-hub/AppointmentsList.tsx` | Remove `phorest_clients` fallback reference |

### Impact

This is a one-line fix per file that will immediately restore all 412 appointments to the hub view. No database migration needed.
