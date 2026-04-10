

# Hide Favorited Cards from Their Original Sections

## Summary
When a card is marked as a favorite, hide it from its original category section to eliminate redundancy. The card only appears in the Favorites section at the top.

## Changes

### `src/pages/dashboard/admin/TeamHub.tsx`

1. **Wrap every card** in the category sections (Hubs, Daily Operations, Scheduling & Time Off, etc.) with a conditional check: if `isFavorited(dashPath('/admin/...'))` is true, don't render that card.

2. **Hide empty sections** — update `CategorySection` to return `null` if all its children are falsy/null (i.e., every card in a section is favorited). This prevents orphaned section headers with no cards beneath them.

3. Implementation approach: wrap each `<ManagementCard>` and `<HubGatewayCard>` in the JSX with `{!isFavorited(dashPath('/admin/xyz')) && (<Card ... />)}` — roughly 25 cards need this guard.

4. Update `CategorySection` to filter out falsy children before rendering, and return `null` if none remain.

## Result
- Favorited cards appear only in the Favorites section
- Their original slot disappears, keeping the grid clean
- If an entire section is emptied by favorites, the section header hides too
- Unfavoriting restores the card to its original section immediately

