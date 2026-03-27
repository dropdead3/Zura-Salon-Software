

## Move Toggle into Dropdown at Small Widths

### Problem
At narrower viewports, the service row shows checkbox + name + toggle + chevron across 4 columns. The toggle competes for space with the service name and badges, causing crowding.

### Approach
Use CSS container queries (per project doctrine) to hide the toggle column at narrow widths and move the toggle into the expanded detail panel instead. This way, at small widths only the chevron remains on the right side of each row.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

1. **Add container query wrapper** around the table's parent `div.rounded-lg.border.overflow-hidden` — add `@container` class (Tailwind container query)

2. **Hide the toggle column at narrow container widths**:
   - On the `<TableHead>` for "Enable Product Billing": add `@[600px]:table-cell hidden` so it only shows when the container is ≥600px
   - On the `<TableCell>` containing the Switch (lines 847–855): add matching `@[600px]:table-cell hidden`

3. **Add toggle inside the expanded detail panel** for narrow widths:
   - Inside the expanded `motion.div` (line 882 area), before the existing tracking/billing grid, add a toggle row that is only visible at narrow widths: `@[600px]:hidden flex items-center justify-between`
   - Shows label "Enable Product Billing" + the same `Switch` component
   - This ensures toggle is always accessible — just relocated into the dropdown

4. **Also show toggle in the "not tracked" state** of the detail panel:
   - Currently when `!service.is_backroom_tracked`, the detail panel shows a prompt to enable tracking
   - Add the same responsive toggle there so users can enable tracking from within the dropdown

### Result
- At ≥600px container width: current layout unchanged (toggle visible in row)
- At <600px: row simplifies to checkbox + name + chevron; toggle lives inside the expandable detail area
- No functionality lost, just relocated for space efficiency

