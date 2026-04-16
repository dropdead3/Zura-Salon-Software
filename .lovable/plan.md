

# Widen Minimum Column Width in DayView

## Change
Update all `min-w-[120px]` occurrences in `DayView.tsx` to `min-w-[160px]`. This gives each stylist column more breathing room for names, appointment cards, and status badges while still allowing horizontal scroll when there are many stylists.

Three locations to update (all in `DayView.tsx`):
- **Line 724** — condensed header columns
- **Line 743** — normal header columns  
- **Line 793** — time slot grid columns

Replace `min-w-[120px]` → `min-w-[160px]` in all three.

### Files Modified
1. `src/components/dashboard/schedule/DayView.tsx`

