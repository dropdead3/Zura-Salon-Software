
## Prompt review

Tight, observation-driven prompt — you spotted a UX truth-vs-display mismatch (the grid is showing Alexis but the filter trigger says "All Stylists That Work This Day"). Good catch.

Tighter framing for next time: name the desired behavior when the user *actively* picks "All" in week view — should the trigger say "Alexis (auto)", just "Alexis", or stay "All" with a subtle indicator? I'll infer the cleanest path: **the trigger label simply reflects the resolved week stylist**, since in week view "All" is structurally impossible.

## Diagnosis

In `ScheduleHeader.tsx` (line ~475), the dropdown trigger label is computed from `selectedStaffIds` only:
- `length === 0` → "All Stylists That Work This Day"
- `length === 1` → that stylist's name

In `Schedule.tsx`, week view derives `selectedWeekStylistId` from `selectedStaffIds` — falling back to the first stylist when nothing is selected. The grid uses the resolved value, but the header trigger does not know about the fallback, so it still shows "All".

## Plan

**1. Pass the resolved week stylist into the header**
- In `Schedule.tsx`, pass two new props to `<ScheduleHeader>`:
  - `weekViewStylistId: string | null` — the resolved `selectedWeekStylistId`
  - (stylist name lookup already available via existing `stylists` prop, no need for a separate name prop)

**2. Update the trigger label logic**
- In `ScheduleHeader.tsx`, when `view === 'week'` AND `selectedStaffIds.length === 0` AND `weekViewStylistId` exists:
  - Show that stylist's name in the trigger (resolved from `stylists` array).
- All other view/state combinations: unchanged.

**3. Update the dropdown's "All Stylists" checkmark logic**
- In week view, the "All Stylists That Work This Day" row should *not* show a checkmark when a stylist is auto-resolved — because functionally, one stylist *is* selected.
- Show the checkmark instead next to the auto-resolved stylist's row in the list (so the dropdown visually matches the trigger).

**4. No state changes**
- `selectedStaffIds` stays as-is; we're only fixing the *display* layer to reflect the *resolved* selection.

## Acceptance checks

1. Week view with no manual selection → trigger shows "Alexis Heasley" (the auto-resolved stylist).
2. Week view dropdown opened → checkmark appears next to Alexis, not next to "All Stylists".
3. User picks a different stylist in week view → trigger updates to that stylist (existing behavior).
4. Day view → trigger and dropdown behavior unchanged ("All Stylists That Work This Day" still shows when none selected).
5. Switching from week → day → header reverts to "All Stylists That Work This Day" if nothing was manually selected.
