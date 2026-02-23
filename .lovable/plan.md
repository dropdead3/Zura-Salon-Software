

# Duplicate Dismissal: "Not a Duplicate" Workflow

## Problem

Clients who legitimately share contact information (e.g., a parent's phone on children's accounts) are incorrectly flagged as duplicates. There is no way to dismiss a false positive -- once flagged, they stay flagged until the shared data is removed.

## Solution: Dismissal Whitelist

Add a lightweight dismissal mechanism that lets admins mark a duplicate pair as "confirmed different people." Once dismissed, those records are no longer shown in the Duplicates tab, and future scans skip whitelisted pairs.

No restructuring of the existing duplicate detection system is required. This layers on top of the current `is_duplicate` / `canonical_client_id` architecture.

## How It Works

1. Admin sees a flagged duplicate pair in the Duplicates tab
2. Admin clicks "Not a Duplicate" (new button alongside existing "Merge" CTA)
3. System records the dismissal and clears the `is_duplicate` flag
4. If contact info changes later and re-triggers detection, the whitelisted pair is skipped
5. Dismissals are reversible from an audit trail

## Technical Details

### 1. New database table: `duplicate_dismissals`

```sql
CREATE TABLE IF NOT EXISTS public.duplicate_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_a_id UUID NOT NULL REFERENCES public.phorest_clients(id) ON DELETE CASCADE,
  client_b_id UUID NOT NULL REFERENCES public.phorest_clients(id) ON DELETE CASCADE,
  dismissed_by UUID REFERENCES auth.users(id),
  reason TEXT, -- optional: "family", "household", "other"
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_a_id, client_b_id)
);
```

With RLS policies for org member read / org admin write, and an index on `(client_a_id, client_b_id)`.

Store IDs in sorted order (smaller UUID first) so lookups are consistent regardless of which record is "primary."

### 2. Update duplicate detection to respect dismissals

Modify the `find_duplicate_phorest_clients` database function and any batch scan logic to exclude pairs that exist in `duplicate_dismissals`. This prevents re-flagging after the dismissal.

### 3. New "Not a Duplicate" action in the UI

**File: `src/components/dashboard/clients/DuplicateDrilldown.tsx`**

Add a "Not a Duplicate" button next to the existing "Merge" button. When clicked:
- Optionally prompt for a reason (Family / Household / Other) via a small popover
- Insert into `duplicate_dismissals`
- Clear `is_duplicate` and `canonical_client_id` on the flagged record
- Optimistically update the client-directory cache to remove the record from the Duplicates tab
- Show a toast with an "Undo" action (deletes the dismissal row)

**File: `src/pages/dashboard/ClientDirectory.tsx`**

Pass the new `onDismiss` handler down to `DuplicateDrilldown`.

### 4. Update the duplicate re-evaluation trigger

**File: Database trigger `reevaluate_duplicate_status`**

When the normalization trigger fires and would re-flag a client as a duplicate, check `duplicate_dismissals` first. If a dismissal exists for that pair, skip re-flagging.

### 5. Audit visibility (optional, low effort)

Add a small "Dismissed Pairs" section at the bottom of the Duplicates tab (or behind a toggle) showing previously dismissed pairs with the ability to undo. This prevents data from silently disappearing.

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Create `duplicate_dismissals` table with RLS |
| Migration SQL | Update `find_duplicate_phorest_clients` to exclude dismissed pairs |
| Migration SQL | Update `reevaluate_duplicate_status` trigger to check dismissals before re-flagging |
| `src/components/dashboard/clients/DuplicateDrilldown.tsx` | Add "Not a Duplicate" button with reason selector |
| `src/pages/dashboard/ClientDirectory.tsx` | Wire dismiss handler, pass to DuplicateDrilldown |
| `src/hooks/useClientsData.ts` | No change needed (dismissed records will have `is_duplicate = false`) |

## Future: Household Grouping (Phase 2)

This dismissal data becomes a signal for a future `client_relationships` table that models family/household connections (parent, child, spouse, guardian). Dismissed pairs can be auto-suggested as relationship candidates. This is a separate effort and not needed now.

