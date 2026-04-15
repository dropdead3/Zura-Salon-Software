

## Reorder Scheduler Header Right Section & Remove Settings

### Problem
The settings gear icon is unnecessary in the scheduler header. The icon buttons (Assistant Blocks, Drafts, Today's Prep) should appear to the left of the dropdown toggles (Location, Staff), with dropdowns pushed to the far right.

### Changes

**File: `src/components/dashboard/schedule/ScheduleHeader.tsx`**

In the right section (lines 234-392), reorder children and remove the Settings button:

**Current order:** CalendarFilters → Dropdowns → Icons → Settings
**New order:** CalendarFilters → Icons → Dropdowns

1. **Remove** the Settings button block (lines 377-391) and its `Settings` icon import
2. **Move** the three icon buttons (Assistant Blocks, Drafts, Today's Prep — lines 315-376) **before** the stacked Location & Staff selectors (lines 241-312)

No styling or functionality changes — just element reordering and removal.

### Files Modified
- `src/components/dashboard/schedule/ScheduleHeader.tsx` — reorder right section children, remove Settings button

