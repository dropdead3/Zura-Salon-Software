
## Hide the Favorite Star on the Executive Summary Tab

### Problem

The "Executive Summary" (leadership) tab already maps to the same route as the "Analytics & Reports" link in the sidebar. Allowing users to pin it creates a redundant shortcut. The star should be hidden for this tab only.

### Change

**`src/pages/dashboard/admin/AnalyticsHub.tsx`** -- line 374

Conditionally render `SubtabFavoriteStar` only when the tab is NOT `leadership`:

```tsx
{cat.id !== 'leadership' && (
  <SubtabFavoriteStar tab={cat.id} subtab="" label={cat.label} />
)}
```

One line changed. No other files affected. Existing pinned "Executive Summary" favorites will still render in the sidebar until the user removes them, but no new ones can be created.
