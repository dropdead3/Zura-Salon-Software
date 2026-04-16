

# Fix Double-Booked Appointment Gaps in Day View

## Problem
When a stylist is double-booked, overlapping appointments show visible padding/gaps between them. This is caused by the width and left offset calculations in `DayView.tsx` (lines 288–304):

- Width: `calc(${widthPercent}% - 4px)` — subtracts 4px from each column
- Left: `calc(${leftPercent}% + 2px)` — offsets each column 2px from the left

This creates a ~4px gap between adjacent overlapping appointment cards. For single-column appointments the 2px side padding is fine, but for side-by-side overlapping cards it produces a noticeable visual gap.

## Fix
In `DayView.tsx`, reduce the gap between overlapping columns while preserving a thin outer margin:

**Lines 288–306** — adjust the width/left calculations:
- When `totalOverlapping > 1`: use `calc(${widthPercent}% - 2px)` for width and `calc(${leftPercent}% + 1px)` for left — this cuts the inter-card gap from ~4px to ~2px
- When `totalOverlapping === 1` (no overlap): keep current `- 4px` / `+ 2px` padding for breathing room

This is a targeted 2-line change in the style calculation block.

### File Modified
1. `src/components/dashboard/schedule/DayView.tsx` — reduce gap between overlapping appointment columns

