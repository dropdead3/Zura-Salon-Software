

# Draft Bookings: Compare View + Auto-Save Feedback + E2E Test

## 1. Side-by-Side Draft Comparison

Add a "Compare" mode to `DraftBookingsSheet` that lets staff select two drafts for the same client and view them in a split layout.

**How it works:**
- When a client group has 2+ drafts, each draft card gets a checkbox-style "Compare" toggle button
- Selecting exactly two drafts activates a comparison dialog (full-width Dialog, not the sheet)
- The comparison dialog shows two columns, each rendering the draft's details: services, stylist, date/time, notes, step progress, created-by, and creation timestamp
- Differences are highlighted with a subtle accent background (e.g., `bg-primary/10` on fields that differ between the two drafts)
- Each column has a "Resume This One" button at the bottom
- A "Cancel" button returns to the sheet

**New component:** `DraftCompareDialog.tsx`
- Accepts two `DraftBooking` objects
- Renders a two-column layout inside a `Dialog`
- Compares fields and marks divergences with a highlight class
- "Resume" on either side triggers `onResume` and closes both the dialog and the sheet

**Changes to `DraftBookingsSheet.tsx`:**
- Add `compareSelection` state: `Set<string>` (draft IDs) scoped per client group
- Add a small "Compare" toggle on each `DraftCard` (visible only when client group has 2+ drafts)
- When `compareSelection.size === 2`, open `DraftCompareDialog`
- Disable the compare toggle when 2 are already selected (unless deselecting)

## 2. Auto-Save Notification Enhancement

Replace the plain `toast.info('Booking saved as draft')` with a richer notification that includes a subtle entrance animation and contextual detail.

**Changes to `QuickBookingPopover.tsx`:**
- Replace the `toast.info(...)` call with a `toast` that uses a custom description showing what was saved (e.g., client name, service count)
- Use `toast.success` with icon styling (checkmark) for clearer positive feedback
- Example:
  ```
  toast.success('Draft saved', {
    description: `${selectedClient?.name || 'No client'} - ${selectedServices.length} service(s)`,
  });
  ```

This leverages the existing Sonner toast system already configured with glass styling and animations. No new component needed -- Sonner's built-in slide-in animation already provides the motion feedback.

## 3. End-to-End Test

Create a Playwright test that validates the full draft booking lifecycle.

**New file:** `e2e/draft-bookings.spec.ts`

Test flow:
1. Navigate to `/dashboard/schedule`
2. Open the booking wizard (click new booking button)
3. Select a service, then close the wizard without completing
4. Verify the "Drafts" badge count increments
5. Open the drafts sheet
6. Verify the draft appears grouped under the correct client (or "No Client Selected")
7. Click "Resume" on the draft
8. Verify the booking wizard reopens with the saved service pre-selected
9. Close the wizard again, reopen drafts, verify the draft is updated (not duplicated)

## File Summary

| Action | File |
|--------|------|
| Create | `src/components/dashboard/schedule/DraftCompareDialog.tsx` -- side-by-side comparison dialog |
| Modify | `src/components/dashboard/schedule/DraftBookingsSheet.tsx` -- compare selection state, compare toggle on cards |
| Modify | `src/components/dashboard/schedule/QuickBookingPopover.tsx` -- enhanced auto-save toast with description |
| Create | `e2e/draft-bookings.spec.ts` -- end-to-end test for draft lifecycle |

