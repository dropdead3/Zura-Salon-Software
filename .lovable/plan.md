

## Enhance Service Tracking Table Responsiveness

### Problem
The table packs 3-4 inline badges plus a switch into the "Tracked" column, causing overlap and overflow at narrower viewport widths. The "Billing Method" column badges also compete for space. Nothing wraps or adapts — elements crash into each other.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**1. Restructure the "Tracked" column layout**
- Change the badges + switch container from a single horizontal `flex` row to a layout that wraps gracefully
- Stack the type badge ("Requires Color/Chemical") and status badge ("Configured ✓" / "Unconfigured") vertically when space is tight, using `flex-wrap` with a controlled gap
- Keep the Switch always right-aligned and on its own, never pushed off-screen

**2. Move the type badge ("Requires Color/Chemical" / "Suggested") into the Service name column**
- Place it as a subtle inline badge below the category subtitle — this is contextual metadata about the service, not a tracking status
- This frees the Tracked column to only show: status badge + switch (two items max)

**3. Apply column width constraints**
- Checkbox column: `w-10` (already set)
- Service column: `min-w-[180px] max-w-[40%]` — ensures name never gets crushed
- Billing Method column: `min-w-[140px]` — gives allowance badges room
- Tracked column: `min-w-[160px]` — enough for status badge + switch
- Expand chevron: `w-10` (already set)

**4. Wrap the table in horizontal scroll for extreme narrow viewports**
- The parent `div.rounded-lg.border` already wraps `Table`, and `Table` component includes `overflow-auto` — verify this works at mobile widths
- Add `min-w-[600px]` on the inner table so it scrolls rather than crushing columns below a minimum

**5. Badge text truncation safety**
- Add `whitespace-nowrap` to all badges to prevent awkward mid-word wrapping
- The "Allowance Needs To Be Set" badge already has `shrink-0` — ensure it doesn't force sibling elements off-screen by allowing the cell to scroll or the badge to sit on its own line

### Technical Details
- Moving the type badge to the Service column is the highest-impact change — it removes 1 badge from the most crowded cell
- Column `min-w` values are based on the widest badge content ("Allowance Needs To Be Set" ≈ 140px, "Requires Color/Chemical" badge ≈ 150px)
- The `min-w-[600px]` on the table ensures graceful horizontal scroll on mobile instead of element collision

### Result
- No badges overlap or crash into each other at any viewport width
- Service metadata (type) lives with the service name where it belongs contextually
- Tracked column is clean: just status + toggle
- Mobile gets horizontal scroll rather than crushed/overlapping content

