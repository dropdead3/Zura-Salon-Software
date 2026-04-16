

# Replace "All Stylists" Toggle with Dropdown Filter Option

## Problem
The current "All Stylists" toggle at the bottom of the staff popover is easy to miss and creates a confusing UX. The user wants it replaced with a selectable filter option in the dropdown — similar to "All Stylists With Appointments" — called "All Stylists That Work This Day."

## Approach
Replace the toggle with a new top-level filter mode. The staff filter will have three modes:
1. **All Stylists With Appointments** — only show stylists who have appointments (current default when toggle is off)
2. **All Stylists That Work This Day** — show all stylists scheduled to work on the selected day (current default when toggle is on)
3. **Individual stylist checkboxes** — unchanged

## Changes

### `src/components/dashboard/schedule/ScheduleHeader.tsx`
- Remove the `showAllStylists` / `onShowAllStylistsChange` props
- Add a new prop: `staffFilterMode: 'with-appointments' | 'work-this-day'` and `onStaffFilterModeChange`
- Replace the toggle section (lines 377-396) with nothing
- Add "All Stylists That Work This Day" as a second selectable option below "All Stylists With Appointments" (lines 352-362)
- Update the button label (line 341) to show "All Stylists That Work This Day" when that mode is active
- Both options show a checkmark when active; selecting either clears individual staff selections

### `src/pages/dashboard/Schedule.tsx`
- Replace `showAllStylists` state with `staffFilterMode` state (`'work-this-day'` as default to match current behavior)
- Update `displayedStylists` memo: when mode is `'with-appointments'`, filter to only those with appointments; when `'work-this-day'`, show all (current `allStylists`)
- Pass `staffFilterMode` / `onStaffFilterModeChange` to `ScheduleHeader` instead of `showAllStylists` / `onShowAllStylistsChange`
- Update `onStaffToggle('all')` to set mode to `'with-appointments'` (preserving current "All" = appointments-only behavior)

### `ScheduleHeader` prop interface update
- Remove: `showAllStylists?: boolean`, `onShowAllStylistsChange?: (value: boolean) => void`
- Add: `staffFilterMode?: 'with-appointments' | 'work-this-day'`, `onStaffFilterModeChange?: (mode: 'with-appointments' | 'work-this-day') => void`

## UX Result
The dropdown will look like:
```text
┌──────────────────────────────────┐
│ ✓ All Stylists With Appointments │
│   All Stylists That Work This Day│
│ ─────────────────────────────── │
│ □ Trinity Graves                 │
│ □ Lex Feddern                    │
│ □ Samantha Bloom                 │
│ ...                              │
└──────────────────────────────────┘
```

Selecting either "All" option clears individual selections. Selecting an individual stylist deselects both "All" options.

