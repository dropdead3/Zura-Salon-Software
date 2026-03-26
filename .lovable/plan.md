

## Add Website Mention to "Adjust to $X" Tooltip

### Change

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

Update the `TooltipContent` text for the "Adjust to $X" button to include the public website as a surface where the new price appears.

**Current tooltip text (approx):**
> "Adjusts the base service price to $X. This will update the price on Service Tracking, the Price Intelligence engine, and any location/level overrides that reference this base price. Rounded up to the nearest $5."

**New tooltip text:**
> "Adjusts the base service price to $X. This will update the price on Service Tracking, the Price Intelligence engine, your public website services page, and any location/level overrides that reference this base price. Rounded up to the nearest $5."

### Scope
- Single file, 1 line changed — tooltip string only
- No logic changes

