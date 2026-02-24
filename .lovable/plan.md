

## Make Category Headers Non-Clickable with Auto-Generated "Overview" Link

### Problem

When "Sales" is favorited as a main tab, the sidebar renders "SALES" as a clickable link. But clicking it navigates to `?tab=sales`, which is the same destination as the "Overview" subtab. This creates a UX redundancy.

### Solution

When a main tab is favorited, the sidebar should render:

```text
  SALES              (non-clickable label, visual grouper only)
    → Overview       (clickable, navigates to ?tab=sales)
```

The category header becomes a static label. The "Overview" link beneath it is the actual clickable navigation target. This eliminates the redundancy while preserving the hierarchical visual structure.

### Behavior Matrix

| What's favorited | Sidebar renders |
|---|---|
| Sales (main tab only) | SALES header (static) + Overview link |
| Sales subtab (e.g., Goals) | SALES header (static) + Goals link |
| Sales main tab + Goals subtab | SALES header (static) + Overview link + Goals link |
| Only Goals subtab (no main tab) | SALES header (static) + Goals link |

In all cases, the category header is **never clickable**. When the main tab is favorited, an "Overview" link is injected as the first child. This "Overview" link navigates to `?tab=sales` (equivalent to the main tab view).

### File Changes

**`src/components/dashboard/CollapsibleNavGroup.tsx`** (lines ~284-317)

Change the category header from an `<a>` tag to a `<div>` (or `<span>`):
- Remove `href`, `onClick` navigation, and `cursor-pointer`
- Keep the existing styling: `font-display uppercase tracking-wide text-muted-foreground`
- Remove the active-state highlight (it's no longer clickable, so no active state needed)
- Keep the unpin star button on hover (so users can still unfavorite the main tab)

Add an "Overview" link when `group.hasTabFavorite` is true:
- Render it as the first item before `group.subtabs.map()`
- Same style as existing subtab links (`pl-14`, `ChevronRight` icon, `font-sans text-xs`)
- Navigates to `?tab={group.tab}` (no subtab param)
- Active state: matches when URL has `tab=X` and no `subtab=` param
- Include an unpin button (unfavorites the main tab, same as the star on the header)

No other files need changes. The hook, data model, and AnalyticsHub star buttons remain the same.

### Technical Details

The "Overview" link for a main-tab favorite is synthesized at render time in CollapsibleNavGroup -- it is not stored as a separate favorite entry. The stored favorite `{ tab: "sales", subtab: "", label: "Sales" }` triggers the Overview link to appear.

The unpin star can appear on either the category header or the Overview link (or both). Clicking it calls `onRemoveSubLink(group.tab, '')` to remove the main tab favorite.
