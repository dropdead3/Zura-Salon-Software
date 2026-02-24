
## Add Main Tab Favoriting to Analytics Hub Sidebar

### What Changes

Extend the existing subtab favoriting system to also support main analytics tabs (Executive Summary, Sales, Operations, Marketing, Campaigns, Program, Reports). When a main tab is favorited, it appears as a sidebar quick link under Analytics Hub -- same as subtab favorites but navigating to just `?tab=X` (no subtab).

### Files to Modify

**1. `src/hooks/useAnalyticsSubtabFavorites.ts`**
- No structural changes needed. Main tab favorites use the same shape: `{ tab: "sales", subtab: "", label: "Sales" }`. The empty `subtab` string distinguishes them from subtab favorites.

**2. `src/pages/dashboard/admin/AnalyticsHub.tsx`**
- Add `SubtabFavoriteStar` next to each main `TabsTrigger` inside the `analyticsCategories.map()` loop (lines 355-373)
- Wrap each trigger + star in a `group/subtab` container (same pattern as SalesTabContent subtabs)
- Pass `tab={cat.id}`, `subtab=""`, `label={cat.label}`

**3. `src/components/dashboard/CollapsibleNavGroup.tsx`**
- Update the `subHref` construction (line 278) to conditionally omit `&subtab=` when `subLink.subtab` is empty
- Update the `isSubActive` check (lines 279-281) to handle main-tab-only favorites (match on `tab=X` without requiring `subtab=`)

**4. `src/components/dashboard/analytics/SubtabFavoriteStar.tsx`**
- Minor: ensure the component works with `subtab=""` (it already should since it compares exact strings)

### Sidebar Link Behavior

| Favorite Type | Sidebar Link URL | Active When |
|---|---|---|
| Main tab (e.g., Sales) | `?tab=sales` | URL has `tab=sales` and no `subtab` param |
| Subtab (e.g., Sales > Goals) | `?tab=sales&subtab=goals` | URL has both `tab=sales` and `subtab=goals` |

### Sort Order in Sidebar

Main tab favorites and subtab favorites are stored in the same array and rendered in insertion order. This means a user who favorites "Sales" then "Staff Performance" sees them in that order. This feels natural -- no separate grouping needed.

### Technical Details

- The `MAX_FAVORITES = 6` cap applies across both main tabs and subtabs combined
- The star on main tabs uses the same hover-reveal pattern as subtab stars
- No new components or hooks needed -- this is purely extending existing infrastructure
