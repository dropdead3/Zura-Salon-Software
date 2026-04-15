

# Widen Schedule Header Toggle Filters

## Problem
"All Stylists With Appointments" gets clipped because the max-width is capped at 220px.

## Fix — 2 class changes in `src/components/dashboard/schedule/ScheduleHeader.tsx`

1. **Location SelectTrigger (line 312):** `max-w-[220px]` → `max-w-[280px]`
2. **Staff Button (line 339):** `max-w-[220px]` → `max-w-[280px]`

280px comfortably fits "All Stylists With Appointments" while still leaving room for adjacent icon buttons and the center date display at the current viewport width (2228px).

