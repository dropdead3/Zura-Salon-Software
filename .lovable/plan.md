

## Replace Sort Dropdown with Tab Toggle on Top Performers Card

**File: `src/components/dashboard/sales/TopPerformersCard.tsx`**

1. Remove the dropdown state (`showDropdown`, `dropdownRef`, outside-click `useEffect`), the `ChevronDown` import (keep `ChevronUp`), and the dropdown JSX block (lines 154-178)

2. Move the sort toggle into the card header as a `FilterTabsList`/`FilterTabsTrigger` on the right side (before `AnalyticsFilterBadge`), using the existing compact filter tab components from `@/components/ui/tabs`

3. Updated header layout:
   - Left: Icon + Title + InfoTooltip (unchanged)
   - Right: `FilterTabsList` with two `FilterTabsTrigger` options ("Revenue" / "Retail"), then `AnalyticsFilterBadge`

4. Replace `useState`-based sort with `Tabs` component wrapping the card, using `onValueChange` to set `sortMode`

**Result**: Clean pill-toggle in the header right column instead of the current "Sorted by: X" dropdown below the header.

