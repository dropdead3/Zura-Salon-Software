
## Prompt review

Crisp and clear — you spotted redundancy in the header (two stylist selectors visible in week view) and called for the cleaner fix. Good instinct.

Tighter framing for next time: name *which* of the two to remove ("keep the dropdown next to Week toggle, remove the right-side one" or vice versa). I'll infer from the screenshot: the left-side "Alexis Heasley" dropdown (next to Day/Week toggle) is the new one we just added; the right-side "All Stylists That Work This Day" is the pre-existing staff filter that's now redundant in week view.

## Diagnosis

The screenshot shows two stylist controls in the week-view header:
1. **Left** (next to Day/Week toggle): the new `selectedWeekStylistId` dropdown showing "Alexis Heasley" — drives the single-stylist week grid.
2. **Right** (under location selector): the pre-existing `staffFilter` dropdown showing "All Stylists That Work This Day" — originally for day view filtering.

In week view, the right-side filter is meaningless (the grid is already scoped to one stylist via the left dropdown). Showing both is confusing.

## Fix

Single change in `ScheduleHeader.tsx`: hide the right-side staff filter when `view === 'week'`. Day view keeps it unchanged.

- Wrap the existing staff-filter render block in a `view !== 'week'` conditional (or equivalent guard).
- No state changes; `staffFilter` value persists silently and re-appears when user switches back to day view.
- Location selector stays visible in both views.

## Acceptance checks

1. Week view header: only the left-side stylist dropdown is visible; right-side staff filter is gone.
2. Day view header: unchanged — staff filter still appears on the right.
3. Switching Week → Day restores the previous staff filter selection.
4. Location selector visible in both views.
