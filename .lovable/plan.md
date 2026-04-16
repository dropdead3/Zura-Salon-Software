

# Fix Schedule Header Filters to Fixed Matching Width

## Problem
The Location and Staff filter dropdowns use `w-auto` with min/max constraints, so they render at different widths depending on content. They should be the same fixed width — wide enough to fit "All Stylists With Appointments".

## Fix — 3 class changes in `src/components/dashboard/schedule/ScheduleHeader.tsx`

1. **Location SelectTrigger (line 312):** Replace `min-w-[140px] max-w-[280px] w-auto` with `w-[280px]`
2. **Staff Button (line 339):** Replace `min-w-[140px] max-w-[280px] w-auto` with `w-[280px]`
3. **Staff PopoverContent (line 350):** Change `w-[220px]` to `w-[280px]` so the dropdown matches the trigger width

Both filters become exactly 280px — aligned and consistent.

