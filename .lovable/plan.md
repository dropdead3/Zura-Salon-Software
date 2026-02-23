

# Schedule Legend / Key Popover

## Summary

Create a "Schedule Key" button in the bottom action bar area that opens a popover/dialog explaining every visual element on the schedule: status colors, badge meanings, grid line types, hatched areas, blocked time overlays, icons, and special indicators. This gives staff an always-accessible reference without leaving the calendar.

## Approach

Create a new `ScheduleLegend` component that renders as a small icon button (e.g., `HelpCircle` or `Info`) positioned in the bottom bar alongside the existing `ScheduleActionBar`. Clicking it opens a popover or sheet that displays a categorized, scrollable legend.

## Legend Sections

The legend will cover these categories:

**1. Appointment Status Colors**
- Booked (muted/gray)
- Confirmed (green)
- Checked In (blue)
- Completed (purple)
- Pending (amber)
- Cancelled (gray, strikethrough overlay)
- No Show (red, destructive overlay with AlertTriangle icon)

**2. Badges (pill indicators on cards)**
- Status badge (e.g., "Confirmed", "Booked") -- colored pill
- "No Check-In" -- red pill, appears when client is past start time and not checked in
- "NEW" -- amber pill, first-time client
- "AST" -- accent pill, stylist is assisting on this appointment

**3. Card Icons**
- Repeat icon -- recurring appointment
- ArrowRightLeft icon -- rescheduled/moved appointment
- Users icon -- has assistant(s) assigned
- RotateCcw icon -- redo appointment
- Star icon -- new client (compact cards)
- AlertTriangle icon -- overdue check-in (compact cards)

**4. Grid and Time Slots**
- Solid line -- hour boundary
- Dashed line -- half-hour boundary
- Dotted line -- quarter-hour boundary
- Gray/muted slot -- past time (no longer available)
- Diagonal hatch pattern -- outside operating hours
- "Closed" badge -- location closed (holiday or regular closure)

**5. Card Overlays**
- X pattern (diagonal cross) -- Block or Break time
- Red ring + tint -- client overdue for check-in
- Dashed amber border -- pending redo appointment
- Strikethrough line -- cancelled appointment
- Red overlay + AlertTriangle -- no-show appointment

**6. Color Modes**
- "By Status" -- cards colored by appointment status
- "By Service" -- cards colored by service category
- "By Stylist" -- cards colored per stylist

## Technical Details

### New File: `src/components/dashboard/schedule/ScheduleLegend.tsx`

- Renders a trigger button (`Info` icon, pill-styled per `tokens.button.cardAction`)
- Opens a `Popover` (desktop) anchored to the button
- Content is a scrollable container with sections, each containing rows of: visual swatch/icon + label + short description
- Status swatches pull colors directly from `APPOINTMENT_STATUS_COLORS` and `APPOINTMENT_STATUS_BADGE` tokens for consistency
- Uses `tokens.heading.card` for section headers and `tokens.body.muted` for descriptions

### Modified File: `src/pages/dashboard/Schedule.tsx`

- Import and render `ScheduleLegend` inside the floating bottom bar area, positioned to the left of the `ScheduleActionBar` (or as an additional element in the bar itself)
- The legend button will sit alongside the existing action bar

| File | Change |
|---|---|
| `src/components/dashboard/schedule/ScheduleLegend.tsx` | New component: legend popover with all schedule visual elements documented |
| `src/pages/dashboard/Schedule.tsx` | Add ScheduleLegend button to the bottom floating bar area |

