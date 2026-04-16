

# Enlarge Quick Day Selector Buttons in Schedule Header

## Problem
The day selector buttons (Today, Thu, Fri, Sat…) in the schedule sub-header are too small. They need to be larger for easier interaction and better visual presence.

## Changes — `src/components/dashboard/schedule/ScheduleHeader.tsx`

### 1. Today button (line ~423)
- `min-w-[56px] px-3 py-2` → `min-w-[72px] px-4 py-3`
- Day name: `text-xs` → `text-sm`
- Date subtext: `text-[10px]` → `text-xs`
- Rounded: `rounded-lg` → `rounded-xl`

### 2. Quick day buttons (line ~465)
- `min-w-[48px] px-2.5 py-2` → `min-w-[64px] px-3.5 py-3`
- Day name: `text-xs` → `text-sm`
- Date subtext: `text-[10px]` → `text-xs`
- Rounded: `rounded-lg` → `rounded-xl`

### Result
Both button types become ~30% larger with bigger text, matching the visual weight expected for a primary navigation element. Single file, 4 class string changes.

