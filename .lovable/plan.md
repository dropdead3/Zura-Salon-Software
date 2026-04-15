

# Capture Phorest Appointment Confirmation Status

## Problem
Phorest's appointment API returns a `confirmed: boolean` field on each appointment (set when clients confirm via SMS/email link, or staff confirms manually). The current sync ignores this field entirely — all `ACTIVE` appointments map to `booked`, which then displays as "Unconfirmed" regardless of actual confirmation state.

## Solution
Capture the `confirmed` boolean during sync and use it to differentiate `confirmed` vs `booked` (unconfirmed) status.

## Implementation

### 1. Update sync to read `confirmed` field
**File:** `supabase/functions/sync-phorest-data/index.ts`

After mapping the Phorest `activationState` to status (line ~513), add a check:

```typescript
// If Phorest says ACTIVE but confirmed=true, mark as confirmed
if (mappedStatus === 'booked' && apt.confirmed === true) {
  mappedStatus = 'confirmed';
}
```

This is a 3-line change. The `confirmed` field is already present in the Phorest API response — it just isn't being read.

### 2. Add debug logging for the confirmed field
In the existing debug block (line ~504), log `apt.confirmed` alongside `activationState` so we can verify the field is coming through.

### 3. No other changes needed
- The `booked` → `unconfirmed` remap in `usePhorestCalendar.ts` already handles unconfirmed appointments correctly
- Appointments that come through as `confirmed` from the sync will skip the remap and display with the green "Confirmed" badge
- The design tokens for `confirmed` status already exist from the previous implementation
- Walk-in logic remains unchanged

## Files to Modify
- `supabase/functions/sync-phorest-data/index.ts` — read `apt.confirmed` and set status accordingly

## Verification
- After next sync, appointments confirmed by clients via SMS/email show green "Confirmed" badge
- Unconfirmed appointments continue showing amber "Unconfirmed" badge
- Debug log confirms the `confirmed` field is present in Phorest API responses

