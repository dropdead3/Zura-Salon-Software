
## Fix Appointment Status Mapping from Phorest API

### Root Cause

The Phorest API does not return a `status` field on appointment objects. Instead, it uses a field called **`activationState`** with three possible values:

- `ACTIVE` -- The appointment is confirmed/active
- `RESERVED` -- The appointment is reserved but not yet confirmed
- `CANCELED` -- The appointment was cancelled

The current sync code reads `apt.status`, which is always `undefined`, causing the `mapPhorestStatus` function to fall back to `'unknown'`. This is why 529 out of 534 appointments display with an "Unknown" badge.

### Regarding Completed/Paid Status

You are correct that the Phorest API does not provide a "completed" or "paid" status on the appointment endpoint. The financial/transaction endpoints (`/purchase/search`, `/report/sales`, `/csvexportjob`) are all returning 404 errors, confirming that your current API credentials do not have permissions for transaction data. Without that data, there is no way to know from Phorest alone whether an appointment was paid/completed.

### Solution

**1. Fix the field name in the sync function**

In `supabase/functions/sync-phorest-data/index.ts`, update the appointment mapping to read `activationState` instead of `status`:

```
status: mapPhorestStatus(apt.activationState || apt.status),
```

**2. Update the status mapping function**

Expand `mapPhorestStatus` to handle Phorest's actual `activationState` values:

| Phorest Value | Mapped Status |
|---|---|
| `ACTIVE` | `booked` (confirmed in Phorest = booked in Zura lifecycle) |
| `RESERVED` | `booked` |
| `CANCELED` | `cancelled` |

**3. Add time-based inference for past appointments**

Since the financial API is unavailable, add a simple time-based heuristic during sync: if an appointment's `activationState` is `ACTIVE` and its date/time is in the past, mark it as `completed`. This gives a reasonable approximation until financial API access is available.

**4. Add debug logging**

Log the first raw appointment object's keys during sync so we can see exactly what fields Phorest returns. This will help confirm the fix and catch any other missing field mappings.

**5. Backfill existing records**

Run a one-time database migration to fix the 529 existing `unknown` status records:
- Past `unknown` appointments become `completed`
- Future `unknown` appointments become `booked`

### Files Modified

- `supabase/functions/sync-phorest-data/index.ts` -- Field name fix, mapping update, time-based inference, debug logging
- Database migration -- Backfill existing `unknown` status records

### Technical Notes

- The 5 appointments that already show `confirmed` were likely created via the internal booking flow (`create-phorest-booking`), which explicitly sets status to `booked`/`confirmed`
- Once Phorest financial API access is granted, the system can use transaction data to distinguish between `completed` and `paid` statuses
- Manual status override from the appointment detail panel remains available as a fallback
