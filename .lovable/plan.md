

# Fix Alphabetical Filter: Positioning and Click-to-Filter

## Problems

1. **Alphabet strip hidden by scrollbar**: The strip is positioned `absolute right-0` which overlaps with the ScrollArea's native scrollbar, making letters partially obscured.
2. **No filter functionality**: Clicking a letter only scrolls to that section. It does not filter the list to show only clients starting with that letter.

## Solution

### 1. Fix positioning overlap

Move the alphabet strip outside the ScrollArea's scroll region by increasing its `right` offset and adding right padding to the scroll content to prevent overlap.

**Files affected:**
- `src/components/dashboard/schedule/QuickBookingPopover.tsx` (line 187): Change `right-0` to `right-1` and increase content padding from `pr-7` to `pr-8`
- `src/components/dashboard/schedule/booking/ClientStep.tsx` (line 62): Same positioning fix

### 2. Add click-to-filter behavior

When a letter is clicked:
- If already active, clear the filter (show all clients again)
- If not active, filter the client list to only show clients whose name starts with that letter

**Changes in `QuickBookingPopover.tsx` (`ClientListWithAlphabet`):**
- Rename `activeLetter` state to serve as both scroll target and active filter
- Add a `filteredClients` memo that filters `sortedClients` by the active letter
- On letter click: toggle the filter (click same letter = clear filter, click new letter = filter to that letter)
- Render `filteredClients` instead of `sortedClients`

**Changes in `ClientStep.tsx` (`ClientStepContent`):**
- Same toggle-filter logic: click a letter filters the list, click again clears it
- Add `filteredClients` memo
- Render filtered list

### 3. Visual feedback

- Active/filtered letter gets `text-primary` styling (already exists)
- Add a small "clear" indicator so users know they can click again to reset

## File Summary

| Action | File |
|--------|------|
| Modify | `src/components/dashboard/schedule/QuickBookingPopover.tsx` -- fix strip position, add filter logic |
| Modify | `src/components/dashboard/schedule/booking/ClientStep.tsx` -- fix strip position, add filter logic |

No new files or dependencies.

