

# Remove Green Indicator Dots from Metrics Table Headers

## Problem

The green/grey dots next to level names in the Criteria Comparison Table header indicate whether retention monitoring is active for that level. However, they lack clear meaning without hovering for the tooltip and are not intuitive for admins scanning the table.

## Change

**File:** `src/components/dashboard/settings/StylistLevelsEditor.tsx`

**Lines ~872-886:** Remove the entire `Tooltip` + dot indicator block. The level header will simply show the level number label, level name, and Edit button — clean and unambiguous.

Retention status is already visible when the admin clicks "Edit" on a level and opens the retention configuration panel, so no information is lost.

## Scope

- Single-file edit, ~14 lines removed
- No database or logic changes

