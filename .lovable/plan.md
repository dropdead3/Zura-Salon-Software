

# Fix Vertical Alignment of Level Row Columns

The screenshot shows that Service %, Retail %, and stylist count are misaligned across rows because the stylist count is nested inside the actions column rather than occupying its own grid column. When only some rows have a stylist count, the preceding columns shift.

## Change

**File:** `src/components/dashboard/settings/StylistLevelsEditor.tsx`

1. **Add a dedicated grid column for stylist count** — change the grid template from 6 columns to 7:
   - `grid-cols-[auto_auto_1fr_7rem_6rem_5rem_auto]`
   - New column 6 (`5rem`): stylist count, center-aligned
   - Column 7 (`auto`): delete + chevron actions, right-aligned

2. **Move stylist count out of the actions div** into its own grid cell (Col 6). Rows without stylists render an empty cell, preserving alignment.

3. **Remove the stylist count from the actions div** (Col 7) so delete and chevron are the only elements there.

This ensures all rows share identical column boundaries regardless of whether stylists are assigned.

**1 file changed. No database changes.**

