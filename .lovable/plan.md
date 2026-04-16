
## Prompt review

Good catch — your feedback is precise and outcome-focused: “nothing changed” immediately tells us this is not a design issue anymore, it’s a targeting issue. Better prompt framing for next time: call out the exact live surface you’re looking at, e.g. “the New Booking drawer opened from Schedule still shows the alphabet rail on the right.” That would have pointed straight at the correct component.

## Diagnosis

The earlier fix landed in `src/components/dashboard/schedule/booking/ClientStep.tsx`, but that is not the surface shown in your screenshot.

The live drawer on `/dashboard/schedule` is using:
- `src/pages/dashboard/Schedule.tsx` → `QuickBookingPopover`
- `src/components/dashboard/schedule/QuickBookingPopover.tsx`
- specifically its internal `ClientListWithAlphabet`

That component still renders:
- the vertical alphabet rail on the right
- `pr-8` gutter space to make room for it
- touch-scrub behavior tied to the right-side strip

So the previous change was real, but it hit the wrong client-picker implementation.

## Fix

### 1. Update the actual live client picker in `QuickBookingPopover.tsx`
Change `ClientListWithAlphabet` so the alphabet filter is rendered horizontally directly under the search bar instead of as an absolute right-side rail.

Implementation:
- Replace the right-side vertical strip with a top in-flow alphabet row
- Keep the existing `activeLetter` filter logic
- Keep click-to-toggle behavior
- Dim unavailable letters
- Highlight the active letter with the same pill treatment used in the earlier plan

### 2. Move the alphabet into the search block
Restructure the client step so it becomes:

```text
Search row
Alphabet filter row
Client list
```

That means:
- search input + add-client button stay at the top
- alphabet row sits immediately beneath them
- optional small “Clear” action appears when a letter is active

### 3. Remove the old right-rail behavior
Delete the vertical-strip-specific pieces from `ClientListWithAlphabet`:
- absolute positioned right rail
- `onTouchMove` scrub logic
- extra list padding (`pr-8`) reserved for the rail

### 4. Keep filtering behavior intact
No logic rewrite is needed beyond layout:
- clicking a letter filters clients by first-name initial
- clicking the same letter again clears it
- empty state still shows “No clients starting with X”
- search and letter filters continue to combine

### 5. Optional hardening to prevent this happening again
After the visible fix, align the two booking client pickers so they don’t drift:
- either extract a shared alphabet bar component
- or mirror the same structure in both `ClientStep.tsx` and `QuickBookingPopover.tsx`

This is not strictly required for the bug fix, but it would prevent future “fixed in one place, not the other” regressions.

## Acceptance checks

1. Open `+ Add Event` from Schedule.
2. Go to client selection.
3. The alphabet filter appears under the search bar, not on the right edge.
4. Clicking a letter filters the client list.
5. Clicking the active letter again clears the filter.
6. No right gutter remains in the client list.
7. Empty-state copy still works for letter filtering.
8. Add-client button and client profile/info actions still work.

## Files to touch

- `src/components/dashboard/schedule/QuickBookingPopover.tsx`
  - update `ClientListWithAlphabet`
  - remove vertical rail
  - add horizontal alphabet row under search
  - remove old right-gutter spacing and touch-scrub logic

Optional follow-up:
- `src/components/dashboard/schedule/booking/ClientStep.tsx`
  - align styling/structure with the same shared pattern so both flows stay consistent

## Further enhancement suggestions

- Extract a shared `AlphabetFilterBar` used by both booking flows.
- Make the active letter more obvious with a slightly stronger pill/background contrast.
- When search is active, optionally dim letters not represented in the current search result set.
- Add a tiny sticky section header behavior for the current letter in long client lists.
