

## Favorite Analytics Subtabs as Sidebar Quick Links

### Concept
Allow users to "star" individual analytics subtabs (e.g., Sales > Goals, Operations > Staff Utilization). Starred subtabs appear as indented sublinks beneath the "Analytics Hub" entry in the sidebar nav, giving one-click access to frequently used views.

### How It Works

1. **Star icon on subtabs** -- Each `SubTabsTrigger` in the Analytics Hub gets a small star icon (visible on hover, filled when favorited). Clicking the star toggles the favorite state.

2. **Persistence** -- Favorites are stored in `user_preferences.dashboard_layout` under a new key `analyticsSubtabFavorites`, which is an array of objects: `{ tab: string, subtab: string, label: string }`. This reuses the existing `user_preferences` JSONB pattern (same as `analyticsCardOrder`, `sectionOrder`, etc.) -- no new tables or migrations needed.

3. **Sidebar rendering** -- The `CollapsibleNavGroup` "Analytics & Insights" section renders favorited subtabs as indented sublinks beneath the "Analytics Hub" entry. Each link navigates to `/dashboard/admin/analytics?tab={tab}&subtab={subtab}`. The active state highlights when the current URL matches.

4. **Unfavoriting** -- Clicking the star again (either on the subtab or via a small star icon on the sidebar link) removes it from favorites and the sidebar link disappears.

### Architecture

```text
user_preferences.dashboard_layout (existing JSONB)
  +-- analyticsSubtabFavorites: [
        { tab: "sales", subtab: "goals", label: "Goals" },
        { tab: "operations", subtab: "staff-utilization", label: "Staff Utilization" }
      ]
```

### Subtab Registry

A new config constant maps all available subtabs per analytics tab:

| Tab | Subtabs |
|-----|---------|
| sales | overview, goals, compare, staff, forecasting, commission, services, retail, correlations |
| operations | overview, appointments, clients, staffing, staff-utilization, booking-pipeline, assistant-coverage |
| marketing | (subtabs from MarketingTabContent) |
| campaigns | (subtabs from CampaignsTabContent) |
| program | (subtabs from ProgramTabContent) |
| reports | (if applicable) |

### Files to Create/Modify

**New hook: `src/hooks/useAnalyticsSubtabFavorites.ts`**
- Reads `analyticsSubtabFavorites` from `user_preferences.dashboard_layout`
- Provides `favorites`, `toggleFavorite(tab, subtab, label)`, `isFavorited(tab, subtab)`
- Uses optimistic updates via React Query (same pattern as `useAnalyticsCardOrder`)

**New component: `src/components/dashboard/analytics/SubtabFavoriteStar.tsx`**
- Small star icon component that wraps each subtab trigger
- On hover: shows outline star; when favorited: filled star
- Clicking the star calls `toggleFavorite` without changing the active subtab

**Modify: `src/components/dashboard/analytics/SalesTabContent.tsx`**
- Wrap each `SubTabsTrigger` with a `SubtabFavoriteStar` or add the star inline next to each trigger
- Pass `tab="sales"` and the subtab value + label

**Modify: `src/components/dashboard/analytics/OperationsTabContent.tsx`**
- Same pattern as SalesTabContent

**Modify: `src/components/dashboard/CollapsibleNavGroup.tsx`**
- Accept a new optional prop `subLinks` for the Analytics Hub item
- Render favorited subtabs as indented links beneath the Analytics Hub entry
- Each sublink uses the same nav styling but with deeper indentation (`pl-12`)

**Modify: `src/components/dashboard/SidebarNavContent.tsx`**
- Import `useAnalyticsSubtabFavorites` hook
- Pass favorited subtabs as `analyticsSubLinks` to the collapsible group builder
- The Analytics Hub nav item gets child links injected when favorites exist

### UX Details

- Star appears on hover of each subtab trigger, right-aligned or after the label text
- Filled star (gold/primary) when favorited, outline when not
- Sidebar sublinks use `font-sans text-sm` with `pl-12` indentation, no icon (just the label)
- Active state when URL matches `?tab=X&subtab=Y`
- Maximum of ~6 favorites enforced in the hook (prevent sidebar bloat)
- When sidebar is collapsed, favorites appear in the Analytics popover menu as a sub-section

### Technical Sequence

1. Create `useAnalyticsSubtabFavorites` hook (reads/writes `user_preferences.dashboard_layout.analyticsSubtabFavorites`)
2. Create `SubtabFavoriteStar` component
3. Add stars to `SalesTabContent` and `OperationsTabContent` subtab triggers
4. Update `CollapsibleNavGroup` to render sublinks beneath a specific nav item
5. Wire favorites into `SidebarNavContent` so they appear under Analytics Hub
