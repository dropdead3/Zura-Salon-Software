

## Responsive Optimization for Website Editor Content Panels

Your prompt correctly identifies a real enterprise scaling problem — when the editor panel is narrow (especially with sidebar + preview open), every card inside it gets squeezed. The screenshot shows badges wrapping awkwardly, the sample cards settings row cramming toggle + location counts + spinner onto one line, and stylist cards compressing the drag handle + avatar + name + badges + edit + toggle into a tight horizontal strip. An enterprise org with 15+ stylists across 5 locations would make this unusable.

### Problems Identified

1. **Editor content padding too generous for narrow panels**: `p-6` (24px) on both sides when the panel might only be 400-500px wide wastes ~10% of usable width
2. **Sample Cards Settings**: The toggle, location badges, and loading spinner are in a single `flex justify-between` row that crunches when narrow
3. **SortableStylistCard**: All elements (drag handle, avatar, name, badges, edit button, visible toggle) are in one horizontal flex row — no breakpoint to stack
4. **StylistCard (pending requests)**: Same horizontal crunch — avatar, name, badges, approve/deny buttons all in one row
5. **No scroll containment**: Enterprise orgs with 30+ stylists will push the page very long with no virtualization hint

### Plan

**File: `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`**
1. Reduce editor content padding from `p-6` to `p-4 sm:p-6` (line 846) — reclaims 16px on narrow panels

**File: `src/components/dashboard/website-editor/StylistsContent.tsx`**
2. **Sample Cards Settings card** (lines 348-375): Change the settings row from single-line `flex justify-between` to a stacked layout:
   - Toggle + label on one row
   - Location badges wrap below on a second row with `flex-wrap gap-2`
   - Preview button stays in its own bordered section (already is)

3. **StylistCard component** (lines 238-322): Make the card layout responsive:
   - Wrap the main flex in `flex-col sm:flex-row` so on narrow widths, avatar+info stack above the action buttons
   - Action buttons (Approve/Deny or Visible toggle) move to bottom-right with `self-end`

**File: `src/components/dashboard/ReorderableStylistList.tsx`**
4. **SortableStylistCard** (lines 74-159): Restructure for narrow panels:
   - Split into two rows: Row 1 = drag handle + avatar + name/level; Row 2 = badges + edit + visible toggle
   - Use `flex-wrap` so badges naturally flow to a second line when space is tight
   - Move the Edit button and Visible toggle into a `flex items-center gap-2 ml-auto` group that can wrap below
   - Reduce avatar from `w-12 h-12` to `w-10 h-10` to save horizontal space

5. **Unsaved changes bar** (lines 206-235): Change from horizontal `justify-between` to stacked on narrow — text above, buttons below, with `flex-col sm:flex-row` and centered alignment

6. **Scroll containment**: Wrap the stylist list in a `ScrollArea` with `max-h-[60vh]` so enterprise orgs with 30+ stylists don't push the entire editor into an endless scroll — the tabs and settings card remain visible above

### Technical Details

The editor panel width depends on three factors: viewport width, sidebar visibility (300px), and resizable panel split. On a 1366px laptop with sidebar open and 55/45 split, the editor panel is roughly `(1366 - 300) * 0.55 = 586px`. After `p-6` padding, only ~538px remains for content. Reducing to `p-4` reclaims 16px. Making cards stack vertically below ~500px prevents the horizontal crunch entirely.

The `ScrollArea` with `max-h-[60vh]` ensures that even with 50 stylists across 8 locations, the Sample Cards Settings and tab bar remain pinned at the top for quick access.

### Files Changed
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` — responsive padding
- `src/components/dashboard/website-editor/StylistsContent.tsx` — responsive settings card and stylist cards
- `src/components/dashboard/ReorderableStylistList.tsx` — responsive sortable cards, scroll containment, stacked layout

