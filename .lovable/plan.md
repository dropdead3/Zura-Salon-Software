# Uniform Stylist Column Headers

## Problem
In `DayView`, every other stylist column header renders with a translucent "glass" tint (`STYLIST_COLUMN_ALT = bg-foreground/[0.06]`), making the header row look uneven — alternating opaque/translucent — which reads as a visual bug rather than intentional rhythm.

## Fix
Remove the alternating tint from the **header rows only**. Keep the alternation on the **time-grid body** so appointment columns retain their visual rhythm.

## Changes — `src/components/dashboard/schedule/DayView.tsx`

1. **Line 902** (condensed header): drop `cn(..., idx % 2 === 1 && STYLIST_COLUMN_ALT)` → plain className.
2. **Line 920** (normal/medium header): same — drop the alternation.
3. **Line 970** (body grid): unchanged — alternation stays.
4. **Lines 96–101** (canon comment): update to document that `STYLIST_COLUMN_ALT` applies to the body only, with a "do not reintroduce on headers" note to prevent regression.

## Out of scope
- `WeekView` headers (single column per day, no alternation present).
- Body grid alternation (preserved intentionally).
- Dark mode (visual delta is identical in both themes; the fix is structural, not theme-specific).
