

## Enhance Service Tracking Table with Collapsible Categories

### What Changes

The flat service table currently renders category headers as non-interactive rows interspersed with service rows. This enhancement converts each category into a collapsible group that:
- Defaults to **collapsed**
- Shows category label with counts: **"BLONDING · 5 services · 3 configured"**
- Clicking the category row toggles visibility of its child service rows
- Chevron icon animates on open/close

### Implementation — 1 File Modified

**`src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`**

1. **Pre-group services by category** — Add a `useMemo` that groups `searchedServices` into `Map<string, ServiceRow[]>` ordered by `categoryOrderMap`. Each group entry tracks:
   - `total`: number of services in the category
   - `configured`: count where `backroom_config_dismissed === true` or has active allowance policy
   - `tracked`: count where `is_backroom_tracked === true`

2. **Add `collapsedCategories` state** — `useState<Set<string>>` initialized to contain ALL category keys (default collapsed). When search query is active, auto-expand all categories so search results are visible.

3. **Replace flat rendering with grouped rendering** — Instead of checking `showCategoryHeader` per row, iterate over category groups:
   - Render a clickable category header row with `ChevronRight`/`ChevronDown` + category name + count badges
   - Only render child service rows when category is NOT in `collapsedCategories`
   - Category header styling: `bg-muted/30`, clickable, with hover state

4. **Category header row layout**:
   ```
   [▶] BLONDING                          5 services · 3 configured
   ```
   - Left: chevron + uppercase category label (font-display, tracking-wider)
   - Right: muted count text showing `{total} services · {configured} configured`
   - When all services in a category are configured, show a subtle emerald indicator

5. **Preserve existing behavior** — Select-all checkbox, bulk actions, expand/collapse of individual service detail rows all continue to work within visible (uncollapsed) categories.

### Technical Details

- Category collapse state is separate from individual service `expandedIds` (which controls the detail/config panel per service)
- When `searchQuery` is non-empty, force all categories open so filtered results are visible
- The "select all" checkbox logic scopes to visible (uncollapsed) untracked services only
- No database changes, no new files — purely a rendering enhancement in the existing component

