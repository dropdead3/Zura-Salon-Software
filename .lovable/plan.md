

# Make Schedule Header Dropdowns Responsive Width

## What Changes
The Location and Staff selector buttons in the schedule header are hardcoded at `w-[160px]`, which clips longer text like location names and "All Stylists". They need to auto-size to fit content, with a max-width cap to prevent overlapping other header elements.

## Implementation

### File: `src/components/dashboard/schedule/ScheduleHeader.tsx`

**3 class changes:**

1. **Location SelectTrigger** (line 312): Replace `w-[160px]` with `min-w-[140px] max-w-[220px] w-auto`
2. **Staff Button** (line 339): Replace `w-[160px]` with `min-w-[140px] max-w-[220px] w-auto`
3. **Parent container** (line 309): Add `items-end` to right-align the stacked selectors cleanly

This lets both dropdowns grow to fit their content (up to 220px) and shrink down to 140px when space is tight, without overlapping adjacent icon buttons or the center date display.

## No Other Files Change

Single file, three class string edits.

