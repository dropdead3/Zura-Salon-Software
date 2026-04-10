

# Operations Hub Favorites + Sidebar Sub-Links

## Summary

Add a "Favorites" section at the top of the Operations Hub page where users can star individual cards for quick access. Favorited cards also appear as sub-links under "Operations Hub" in the sidebar navigation.

## Data Layer

**No new tables needed.** Store favorites in the existing `user_preferences.dashboard_layout` JSON field under a new key `opsHubFavorites` — an array of objects: `{ href: string, label: string, icon: string }`.

### New hook: `src/hooks/useOpsHubFavorites.ts`
- Read/write `dashboard_layout.opsHubFavorites` from `user_preferences` (same pattern as `useAnalyticsSubtabFavorites` and `useAnalyticsCardOrder`)
- Expose: `favorites`, `isFavorited(href)`, `toggleFavorite(href, label, iconName)`, `isAtLimit` (cap at 8)
- Optimistic updates with rollback on error

## Operations Hub UI Changes

### `src/pages/dashboard/admin/TeamHub.tsx`

1. **Star icon on every card** — Add a favorite toggle (star icon) to `ManagementCard` and `HubGatewayCard`. On hover, a star appears in the top-right corner. Filled star = favorited.

2. **Favorites section at top** — When any cards are favorited, render a "Favorites" `CategorySection` above "Hubs" showing only the favorited cards as quick-access links (same card style, slightly compact). If no favorites, the section is hidden.

3. **Card components** receive new optional props: `isFavorited`, `onToggleFavorite`, and the star is rendered conditionally.

## Sidebar Sub-Links

### `src/components/dashboard/SidebarNavContent.tsx`

When rendering the `ops` section:
- After the "Operations Hub" main link, if the user has `opsHubFavorites`, render them as indented sub-links (smaller text, left-padded, with a dot or small icon)
- Use the same pattern as regular nav links but with `pl-8` indent and `text-xs` sizing
- Sub-links resolve through `dashPath()` like all other nav items
- In collapsed mode, sub-links appear in the hover popover alongside "Operations Hub"

## Icon Mapping

Since we persist to JSON, store icon names as strings (e.g., `"Users"`, `"CalendarClock"`) and resolve them via a lookup map in the hook or a shared utility. The Operations Hub already imports all needed icons.

## Technical Details

- **Files created**: `src/hooks/useOpsHubFavorites.ts`
- **Files modified**: `src/pages/dashboard/admin/TeamHub.tsx`, `src/components/dashboard/SidebarNavContent.tsx`
- **No migrations needed** — uses existing `dashboard_layout` JSON column
- **No new permissions** — favorites are personal preferences, not org-scoped data

