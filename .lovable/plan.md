

# Remove Remaining Tier Selector from BackroomEntitlementsTab

## Changes in `src/components/platform/backroom/BackroomEntitlementsTab.tsx`

1. **Line 698**: Remove the duplicate "Status" `<th>` (which was the tier column header)
2. **Lines 733–753**: Remove the entire `<td>` containing the Starter/Professional/Unlimited `<Select>` dropdown
3. **Line 806**: Remove the `plan_tier: ent.plan_tier` reference in the scale count update handler (just pass scale_count and status)

This eliminates the last remnant of the old 3-tier system from the platform admin UI.

