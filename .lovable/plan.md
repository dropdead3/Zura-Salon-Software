

## Remove Existing "Executive Summary" Favorites from Sidebar

### Problem

We blocked new leadership favorites from being created, but any previously pinned "Executive Summary" (leadership tab) favorites still appear in the sidebar with no way to unpin them (since the star was removed).

### Solution

Filter out `leadership` tab entries from `groupedFavorites` in `useAnalyticsSubtabFavorites.ts` so they never render in the sidebar. This is a single-line addition to the existing memo.

### Change

**`src/hooks/useAnalyticsSubtabFavorites.ts`** -- inside the `groupedFavorites` memo (around line 115)

After building the groups map from favorites, filter out the `leadership` tab before sorting and returning:

```typescript
// Before the sort, filter out leadership (redundant with Analytics & Reports link)
groups.delete('leadership');
```

This ensures:
- Existing pinned "Executive Summary" entries disappear from the sidebar immediately
- No new leadership favorites can appear (already blocked in AnalyticsHub.tsx)
- The underlying data in user_preferences is harmless and will be ignored

One line added. No other files affected.

