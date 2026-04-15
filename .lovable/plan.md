

# Remove Horizontal Scroll — Fit All Schedule Columns Responsively

## Problem
The DayView and WeekView enforce minimum widths (`min-w-[600px]`, `min-w-[800px]`, `min-w-[160px]` per column) that force horizontal scrolling on desktop. This is unusable without a touchscreen or trackpad.

## Solution
Remove all minimum-width constraints so columns flex equally to fill available space. Card internal content adapts by truncating text and hiding secondary details when columns are narrow.

## Changes

### 1. DayView — Remove min-width constraints
**File:** `src/components/dashboard/schedule/DayView.tsx`

- **Line 457:** Remove `min-w-[600px]` from the inner container (just use a plain `div`)
- **Line 468:** Remove `min-w-[160px]` from stylist header columns
- **Line 511:** Remove `min-w-[160px]` from stylist body columns

All columns keep `flex-1` so they divide available space equally.

### 2. WeekView — Remove min-width constraint
**File:** `src/components/dashboard/schedule/WeekView.tsx`

- **Line 226:** Remove `min-w-[800px]` from the inner container

### 3. Card content — Responsive text truncation
**File:** `src/components/dashboard/schedule/AppointmentCardContent.tsx`

The card content already uses `truncate` on most text lines and scales by `CardSize`. The main improvement needed:

- In `GridContent`, when many columns are visible and cards are narrow, ensure the status badge and indicator cluster don't overflow. Add `overflow-hidden` on the top-row containers and reduce badge padding at small widths.
- Add `text-[11px]` fallback sizing on service name lines so they compress gracefully.
- Ensure the compact view's `pr-16` (right padding for indicators) is reduced to `pr-8` to avoid wasting space in narrow columns.

### 4. Stylist header — Responsive name display
**File:** `src/components/dashboard/schedule/DayView.tsx`

- Add `truncate` and `min-w-0` to the stylist name container so long names don't force column widths.
- Hide the stylist phone number when columns are narrow (already conditional, just ensure it truncates).

## Technical Details

| Location | Current | New |
|----------|---------|-----|
| DayView line 457 | `min-w-[600px]` | *(removed)* |
| DayView line 468 | `flex-1 min-w-[160px]` | `flex-1 min-w-0` |
| DayView line 511 | `flex-1 min-w-[160px]` | `flex-1 min-w-0` |
| WeekView line 226 | `min-w-[800px]` | *(removed)* |
| GridContent compact `pr-16` | `pr-16` | `pr-8` |

## Files to Modify
- `src/components/dashboard/schedule/DayView.tsx` — remove min-width constraints, add truncation to headers
- `src/components/dashboard/schedule/WeekView.tsx` — remove min-width constraint
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — tighten compact padding, add overflow protection

