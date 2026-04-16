

# Enlarge Zoom Controls for Better Readability

## Problem
The zoom increment label (`5m`, `15m`, etc.) uses `text-[10px]` and the zoom icons use `h-3.5 w-3.5` inside `h-7 w-7` buttons — too small to read comfortably, as shown in the screenshot.

## Changes — `src/components/dashboard/schedule/ScheduleActionBar.tsx`

1. **Increment label** (line 157): `text-[10px]` → `text-xs`, `min-w-[28px]` → `min-w-[32px]`
2. **Button hit targets** (lines 168, 183): `h-7 w-7` → `h-8 w-8`
3. **Icon sizes** (lines 172, 186): `h-3.5 w-3.5` → `h-4 w-4`
4. **Gap between controls** (line 153): `gap-0.5` → `gap-1`

