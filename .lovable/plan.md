
## Diagnosis

The user is on `QuickBookingPopover` (clicked an empty time slot → "NEW BOOKING — Thu, Apr 16 at 4:30 PM"). This is a **separate component** from `BookingWizard` (the toolbar's "+ New Booking" button). The previous alphabet-filter fix only patched `BookingWizard` + its `ClientStep`. `QuickBookingPopover` has its own duplicate `ClientListWithAlphabet` implementation that has the same root bug.

**Root cause** (identical to last round's fix):
- The query at line 528 fetches only `.limit(50)` clients ordered alphabetically by name.
- The alphabet bar's filter logic (`ClientListWithAlphabet`, lines 144–153) is **client-side only** — it filters the already-fetched 50 records.
- The first 50 clients alphabetically are mostly A's and early B's, so clicking M, P, Z, etc. filters down to zero matches → the list goes empty and the bar appears non-functional.
- The buttons themselves *are* wired (line 172 `onClick={() => available && handleLetterClick(letter)}`), but visually nothing useful happens because there are no matching clients in the cached batch.

A secondary minor issue: `tabIndex={-1}` (line 182) blocks keyboard focus but mouse clicks still register.

## Fix

Apply the same lift-state-and-make-query-letter-aware pattern used for `BookingWizard`. Single-file change in `QuickBookingPopover.tsx`.

1. **Lift `activeLetter` state** out of `ClientListWithAlphabet` into the `QuickBookingPopover` parent (so the data fetch can see it).
2. **Update the `clients` query** (line 528):
   - Add `activeLetter` to the queryKey.
   - When `activeLetter` is set, add `.ilike('name', `${activeLetter}%`)` and bump limit to `500`.
   - When neither search nor letter is active, keep `.limit(50)`.
3. **Mutual exclusivity**:
   - Setting `clientSearch` clears `activeLetter`.
   - Setting `activeLetter` clears `clientSearch`.
4. **Pass `activeLetter` + `onLetterChange` as props** into `ClientListWithAlphabet`. Make the component controlled (mirror the pattern already in `ClientStep.tsx`: `isControlled` flag, skip client-side letter filter when controlled).
5. **Remove `tabIndex={-1}`** on the alphabet buttons so keyboard nav works.
6. Reset `activeLetter` to `null` in the existing reset routine (around line 862) and when the popover closes.

## Out of scope

- `BookingWizard` (already fixed last round).
- `NewBookingSheet` (different surface, not in screenshot).
- The two duplicate `ClientListWithAlphabet` / `ClientStep` components — worth consolidating into a single shared component as a follow-up, but skipping now to keep the blast radius small.

## Acceptance checks

1. Schedule → click empty time slot → reach Client step.
2. Click "M" → list refreshes with all clients whose first name starts with M (server fetches up to 500).
3. Click "M" again → filter clears, list returns to default.
4. Click "Z" → previously empty, now shows actual Z-name clients if any exist.
5. Typing in the search field clears the active letter and disables the alphabet highlight.
6. Clicking a letter clears any text in the search field.
7. Closing and reopening the popover resets the letter selection.
8. `BookingWizard` (toolbar's "+ New Booking") still works as before.

## Files to touch

- **Modify** `src/components/dashboard/schedule/QuickBookingPopover.tsx`
  - Lift `activeLetter` state to parent (~line 270 area)
  - Update clients `useQuery` (line 528) to be letter-aware
  - Wire mutual exclusivity in `setClientSearch` and `setActiveLetter`
  - Make `ClientListWithAlphabet` accept controlled `activeLetter` / `onLetterChange` props
  - Remove `tabIndex={-1}` on alphabet buttons
  - Reset `activeLetter` in the existing reset/close logic
- **Untouched**: `BookingWizard.tsx`, `ClientStep.tsx`, `NewBookingSheet.tsx`, `NewClientStep.tsx`.

## Further enhancement suggestions

- Consolidate `ClientListWithAlphabet` (in `QuickBookingPopover`) and `ClientStep` (in `booking/`) into one shared `<ClientPicker>` component so the next behavioral fix doesn't need to be applied twice. This is the third time we've hit "fixed it in one surface, broke parity with the other."
- Add a tiny telemetry signal: log when an alphabet click yields 0 results — would surface data-quality gaps (e.g., no clients starting with X) to admins instead of looking like a UI bug.
- Consider visually dimming **and** removing from tab order any letters with no matching clients in the org-wide roster (would require a one-time `select distinct upper(left(name,1))` to seed the available set rather than inferring from the cached batch).
