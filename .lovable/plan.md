

# Remove Bottom Blur Effect from Week View Header

## Change
Delete the "Bottom blur fade" div (lines 442–452) in `WeekView.tsx`. This is a decorative gradient/blur element below the sticky day-header row that creates a visual smear over appointment cards.

### File Modified
1. `src/components/dashboard/schedule/WeekView.tsx` — remove lines 442–452

