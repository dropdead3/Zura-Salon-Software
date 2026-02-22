
# Gap Analysis Fixes -- Assistant Time Block System

## Summary

This plan addresses the critical gaps identified in the Phase 1-3 analysis. Changes are grouped by priority: critical action flow fixes first, then data completeness, then UX polish.

---

## Fix 1: Accept Action -- Prevent Overwriting Pre-Assigned Assistant (Critical)

**File**: `src/components/dashboard/schedule/AssistantBlockActions.tsx`

**Problem**: `handleAccept` always sets `assistant_user_id: user.id`, overwriting any pre-assigned assistant. This is wrong when an admin accepts on behalf of someone else.

**Fix**: Only set `assistant_user_id` if it is currently null. The update call should conditionally include the field.

---

## Fix 2: Decline Action -- Clear `assistant_user_id` and Allow Re-Request (Critical)

**File**: `src/components/dashboard/schedule/AssistantBlockActions.tsx`

**Problem**: `handleDecline` sets status to `declined` but does not clear `assistant_user_id`. This prevents re-assignment. Also, there is no "re-request" flow.

**Fix**: On decline, set `status: 'requested'` and `assistant_user_id: null` instead of `status: 'declined'`. This returns the block to the unassigned pool so someone else can pick it up. This is the correct behavior -- a decline should mean "I can't do it, find someone else," not "kill this request."

---

## Fix 3: Pending Blocks Hook -- Add Date Scoping (Data)

**File**: `src/hooks/useAssistantTimeBlocks.ts`

**Problem**: `useMyPendingAssistantBlocks` has no date filter, so stale past blocks inflate the badge count indefinitely.

**Fix**: Add a `.gte('date', todayStr)` filter to both queries in `useMyPendingAssistantBlocks`.

---

## Fix 4: ScheduledCoverageSection -- Pass Organization ID (Data)

**File**: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

**Problem**: `ScheduledCoverageSection` passes `null` as `organizationId` to `useAssistantTimeBlocks`. While the hook doesn't use it for querying (it filters by date + location), this is semantically incorrect and would break if org scoping were added later.

**Fix**: Pass the appointment's `organization_id` (from the component's context) instead of `null`.

---

## Fix 5: QuickBookingPopover -- Reset `requestAssistant` State (UX)

**File**: `src/components/dashboard/schedule/QuickBookingPopover.tsx`

**Problem**: The `requestAssistant` toggle state is never reset in `handleClose`, so it persists across bookings.

**Fix**: Add `setRequestAssistant(false)` to the `handleClose` function.

---

## Fix 6: Manager Sheet Delete -- Add Confirmation Dialog (UX)

**File**: `src/components/dashboard/schedule/AssistantBlockManagerSheet.tsx`

**Problem**: Delete action in `BlockRow` has no confirmation, making accidental deletion too easy.

**Fix**: Add an `AlertDialog` confirmation before executing the delete.

---

## Fix 7: Manager Sheet Date Format -- Include Year for Cross-Year (UX)

**File**: `src/components/dashboard/schedule/AssistantBlockManagerSheet.tsx`

**Problem**: Date headings use `EEEE, MMM d` which omits the year.

**Fix**: Change format to `EEEE, MMM d, yyyy`.

---

## Fix 8: Overlay -- Show Declined Status Visually (UX)

**File**: `src/components/dashboard/schedule/AssistantBlockOverlay.tsx`

**Problem**: Declined blocks with no assistant_user_id fall through to "unassigned" rendering. There is no visual distinction for a block that was explicitly declined vs one that was never assigned.

**Fix**: After the decline fix (Fix 2), declined blocks revert to `requested` with `assistant_user_id: null`, so this resolves itself. No separate visual change needed.

---

## Technical Details

### Files Modified

| File | Changes |
|---|---|
| `src/components/dashboard/schedule/AssistantBlockActions.tsx` | Fix accept/decline logic |
| `src/hooks/useAssistantTimeBlocks.ts` | Add date scoping to pending blocks hook |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Pass org ID to coverage section |
| `src/components/dashboard/schedule/QuickBookingPopover.tsx` | Reset requestAssistant state |
| `src/components/dashboard/schedule/AssistantBlockManagerSheet.tsx` | Add delete confirmation dialog, fix date format |
