
## Prompt review

Clear correction — you flipped my earlier inference. The screenshot confirms: keep the right-side staff filter (under the location toggle), remove the left-side "Alexis Heasley" dropdown sitting next to the Shifts button.

Tighter framing for next time: this was already crisp. The screenshot + explicit "do not remove X" left zero ambiguity. Good prompt.

## Diagnosis

The left-side dropdown is the `selectedWeekStylistId` selector I added in the previous step (in `ScheduleHeader.tsx`, conditionally rendered when `view === 'week'`, positioned next to the Day/Week toggle and Shifts button). The right-side staff filter is the pre-existing one and stays.

But — the week view grid still needs a single stylist to render. So we can't just delete the state; we need the grid to derive its stylist from the **right-side staff filter** instead.

## Plan

**1. Remove the left-side stylist dropdown UI**
- In `ScheduleHeader.tsx`, delete the conditional `<Select>` block (and its props: `weekStylists`, `selectedWeekStylistId`, `onWeekStylistChange`) that renders next to the Day/Week toggle.

**2. Drive week view from the existing right-side staff filter**
- In `Schedule.tsx`, remove `selectedWeekStylistId` state, its localStorage persistence, and the auto-select effect.
- Derive the week-view stylist from the existing `staffFilter` value:
  - If `staffFilter` is a specific stylist ID → use that stylist for the week grid.
  - If `staffFilter` is `"all"` (or equivalent default) → auto-fall-back to the **first stylist of the current location** (preserving the "always show one stylist" guarantee).
- Pass the resolved stylist ID down to `WeekView` as before.

**3. WeekView unchanged**
- `WeekView.tsx` keeps its current single-stylist rendering logic; only the source of `selectedStylistId` changes upstream.

**4. Header behavior**
- Right-side staff filter remains visible in both Day and Week views (reverting my earlier "hide in week view" suggestion — you've now clarified it stays).
- In week view, selecting a stylist from the right-side filter switches the visible stylist in the grid.
- Selecting "All" in week view falls back to the first stylist (since multi-stylist week grid is gone by design).

## Acceptance checks

1. Left-side stylist dropdown (next to Shifts) is gone.
2. Right-side staff filter (under location selector) remains visible in both views.
3. Week view renders one stylist, sourced from the right-side staff filter.
4. Selecting a specific stylist in the right-side filter while in week view updates the grid.
5. Selecting "All Stylists" in week view falls back to the first stylist of the current location.
6. Day view behavior unchanged.
