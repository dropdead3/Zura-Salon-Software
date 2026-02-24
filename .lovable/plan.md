

## Save Draft Booking with Availability Validation

### What Already Exists

The draft booking infrastructure is already well-built:
- `draft_bookings` database table with 7-day expiry
- Save/delete/batch-delete mutations in `useDraftBookings.ts`
- `DraftBookingsSheet` with search, client grouping, compare, resume, and discard
- Auto-save on close (when the booking popover is dismissed with unsaved data)
- Resume flow that pre-populates the booking wizard from draft data

### What's Missing

1. **No explicit "Save for Later" button** -- drafts are only auto-saved on close, with no deliberate save action on the confirm step
2. **No availability check on resume** -- when a draft is resumed, the original time/stylist may be taken
3. **No staleness indicator** -- the DraftBookingsSheet shows drafts without flagging conflicts
4. **No alternative time suggestions** -- when a draft's slot is unavailable, staff must manually hunt for a new time

### Changes

#### 1. Add "Save for Later" Button (QuickBookingPopover.tsx)

On the confirm step footer, add a secondary "Save for Later" button alongside "Confirm Booking":

- Button placement: left of "Confirm Booking", outline variant, with a `Save` icon
- On click: explicitly saves the draft using `saveDraft.mutate()` with all current wizard state, then shows a success toast: "Draft saved -- [Client Name] -- [Service Count] service(s)" 
- After saving, closes the popover with `skipDraftSave = true` (prevents double-save from the close handler)
- Available on all steps (not just confirm), via a persistent "Save for Later" option in the header close area or as a footer action

#### 2. Availability Check on Draft Resume (DraftBookingsSheet.tsx)

When a draft card renders in the sheet, run a lightweight availability check:

- Query `phorest_appointments` for the draft's `appointment_date`, `start_time`, and `staff_user_id` to detect conflicts
- New hook: `useDraftAvailabilityCheck(draft)` that returns `{ isAvailable, conflicts, nextSlots }`
  - Checks if the original time slot is still free for the specified stylist
  - If unavailable, queries for the next 3 available slots for the same stylist on the same day (and optionally the next day)
- Results are cached per draft ID with a 60-second stale time

#### 3. Staleness Indicator on Draft Cards (DraftBookingsSheet.tsx)

Update `DraftCard` to show availability status:

- **Available**: Small green dot or checkmark next to the date/time line -- "Slot still open"
- **Conflict detected**: Amber/red warning badge -- "Original slot taken"
  - Expandable section below showing:
    - "Next available:" followed by up to 3 alternative time chips (e.g., "2:30 PM", "3:00 PM", "4:15 PM")
    - Clicking a chip updates the draft's `start_time` in the database and resumes the booking wizard at the confirm step with the new time
- **Stylist unavailable** (e.g., day off): Shows "Stylist unavailable on this date" with option to resume and re-select stylist
- **No date/time set**: No indicator (draft was saved too early in the flow)

#### 4. Quick Rebook from Stale Draft (DraftBookingsSheet.tsx)

When a draft has conflicts, the "Resume" button label changes to "Resume and Adjust". Additionally, the alternative time chips provide a one-tap path:

- Staff taps a suggested time chip
- Draft is updated with the new `start_time`
- Booking wizard opens at the confirm step with all other data preserved
- A toast confirms: "Time updated to 3:00 PM"

#### 5. Success Toast Refinement

- Explicit save: "Draft saved" with client name and service count in description
- Auto-save on close: Keep existing behavior (already shows "Draft saved")
- Resume from stale draft: "Time updated to [time]" when picking an alternative slot

### Files Modified

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` -- Add explicit "Save for Later" button on confirm step footer
- `src/hooks/useDraftAvailabilityCheck.ts` -- New hook to check if a draft's time slot is still available and suggest alternatives
- `src/components/dashboard/schedule/DraftBookingsSheet.tsx` -- Add availability indicators, conflict warnings, and alternative time chips to draft cards
- `src/hooks/useDraftBookings.ts` -- No structural changes needed, but `useSaveDraft` will be called from the new explicit save path

### Architecture Notes

- The availability check queries `phorest_appointments` (the primary appointment source), not the local `appointments` table, since the schedule view is Phorest-sourced
- The check runs on mount of the DraftBookingsSheet (not on every render) and uses `staleTime: 60000` to avoid excessive queries
- Alternative time suggestions use the same slot-checking logic as the existing `check-availability` edge function, but executed client-side against cached appointment data for speed
- Walk-in drafts (no client) are still saveable -- the availability check focuses on stylist + time, not client

### What This Does NOT Change

- Draft expiry (7 days) remains unchanged
- Auto-save-on-close behavior is preserved
- DraftCompareDialog is unaffected
- No database schema changes required

### Potential Gaps Addressed

| Gap | Resolution |
|-----|-----------|
| Double-booking from stale draft | Availability check warns before resume |
| No explicit save action | "Save for Later" button on confirm step |
| Staff must manually find new times | Alternative time chips with one-tap rebook |
| No feedback on save | Success toast with client/service context |
| Stylist schedule changed | Conflict indicator + resume-and-adjust flow |

