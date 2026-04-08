

# Enhanced Date Range Presets for ReportsHub + Disabled Date Styling

## Overview
Replace the two inline preset buttons in ReportsHub with a full sidebar preset list (Shopify-style), and improve the Calendar component's disabled-date styling so non-selectable dates are visually distinct from selectable ones.

## Changes

### 1. `src/pages/dashboard/admin/ReportsHub.tsx`

Rewrite the date picker popover content to include a **left sidebar** with preset buttons and the calendar on the right:

- **Preset list** (vertical stack, left side):
  - Today, Yesterday, Last 7 Days, Last 30 Days, Last 90 Days, Week to Date, Month to Date, Last Month, Year to Date, Custom Range
- **Behavior**:
  - Clicking any preset (except Custom Range) computes the date range using `date-fns`, sets it immediately, updates `datePreset`, and closes the popover
  - "Custom Range" activates the calendar for manual selection (calendar always visible but only interactive in custom mode, or simpler: always show calendar, highlight active preset)
  - All presets cap `to` at today
- **Layout**: `flex` row — preset sidebar `w-[160px] border-r` + calendar area
- Import additional `date-fns` functions: `subDays, startOfWeek, startOfYear`
- Use `dateRangeLabels.ts` types/labels for consistency
- Add `open` / `onOpenChange` state to the Popover so presets can close it programmatically

### 2. `src/components/ui/calendar.tsx`

Enhance the `day_disabled` class to make non-selectable dates clearly distinct:

**Current:** `"text-muted-foreground opacity-50"`

**Updated:** `"text-muted-foreground/40 opacity-30 cursor-not-allowed line-through"`

This adds:
- Lower opacity (30% vs 50%) for stronger visual separation
- `cursor-not-allowed` so hover communicates non-interactivity
- `line-through` as a subtle strikethrough indicator (common pattern for unavailable dates)

The `toDate` prop already prevents click interaction — this just makes it visually obvious.

### Files Modified

| File | Change |
|---|---|
| `ReportsHub.tsx` | Replace 2-button preset strip with full sidebar preset list inside popover; add programmatic close on preset click; compute ranges with `date-fns` |
| `calendar.tsx` | Update `day_disabled` classes for stronger visual distinction (lower opacity, cursor-not-allowed, line-through) |

2 file edits. No migrations.

