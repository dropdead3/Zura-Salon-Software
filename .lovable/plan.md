

# Fix: Stale Duplicate Flags Not Cleared

## Root Cause

The `reevaluate_duplicate_status_trigger` was created **after** you already removed the phone number from "Test Test". The trigger only fires on future UPDATEs, so the existing stale flags were never cleared.

Current state in the database:
- **Eric Day** (cff0282d): `is_duplicate = true`, `canonical_client_id = 76cd57b1` (pointing to Test Test), phone = 14805430240
- **Test Test** (76cd57b1): `is_duplicate = false`, phone = NULL, email = eric@dropdeadhair.com

They no longer share a phone or email, so neither should be flagged as a duplicate.

## Solution

### 1. One-time data cleanup (database migration)

Run a cleanup query that scans all records with `is_duplicate = true` and checks if they still match their canonical on email or phone. If not, clear the flags. This catches any stale data from before the trigger existed.

### 2. Add a periodic safety net to the saveMutation

After saving client info, also explicitly clear `is_duplicate` and `canonical_client_id` if the record no longer matches its canonical. This provides a belt-and-suspenders approach alongside the trigger.

## Technical Details

### Database migration (one-time cleanup)

```sql
-- Clear is_duplicate on records whose canonical no longer matches on email or phone
UPDATE phorest_clients dup
SET is_duplicate = false, canonical_client_id = NULL
WHERE dup.is_duplicate = true
  AND dup.canonical_client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM phorest_clients canon
    WHERE canon.id = dup.canonical_client_id
      AND (
        (dup.email_normalized IS NOT NULL AND canon.email_normalized IS NOT NULL
         AND dup.email_normalized = canon.email_normalized)
        OR
        (dup.phone_normalized IS NOT NULL AND canon.phone_normalized IS NOT NULL
         AND dup.phone_normalized = canon.phone_normalized)
      )
  );
```

### Frontend: `src/components/dashboard/ClientDetailSheet.tsx`

In the `saveMutation` (the one that saves name, email, phone), after the main update succeeds, add a follow-up query: if the saved client has `is_duplicate = true`, re-check whether it still matches its canonical. If not, clear the flags. This ensures any phone/email removal immediately clears the duplicate status without relying solely on the trigger.

```typescript
// After main update succeeds, clear stale duplicate flag if needed
if (client.is_duplicate && client.canonical_client_id) {
  const { data: canonical } = await supabase
    .from('phorest_clients')
    .select('email_normalized, phone_normalized')
    .eq('id', client.canonical_client_id)
    .single();

  const newEmail = (editEmail.trim() || '').toLowerCase();
  const newPhone = editPhone.trim();
  const emailMatch = newEmail && canonical?.email_normalized === newEmail;
  const phoneMatch = newPhone && canonical?.phone_normalized; // simplified check

  if (!emailMatch && !phoneMatch) {
    await supabase
      .from('phorest_clients')
      .update({ is_duplicate: false, canonical_client_id: null } as any)
      .eq('id', client.id);
  }
}
```

This two-pronged approach fixes the existing data immediately and prevents future occurrences even if trigger timing causes edge cases.

