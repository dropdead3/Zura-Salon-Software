

## Hierarchical Favorite Pinning in Analytics Sidebar

### Problem

Currently, main tab favorites (e.g., "Sales") and subtab favorites (e.g., "Sales > Goals") render as a flat list under Analytics Hub in the sidebar. This creates visual confusion -- you can't tell which subtabs belong to which category, and the hierarchy is lost.

### Proposed Solution: Grouped Tree Structure

Favorites in the sidebar will render as a **two-level tree** grouped by their parent category:

```text
  [icon] Analytics Hub
           Sales                  (category header, clickable)
             → Goals              (subtab shortcut)
             → Commission         (subtab shortcut)
           Operations             (category header, clickable)
             → Staff Utilization  (subtab shortcut)
```

**Key behaviors:**

- When you favorite a **main tab only** (e.g., "Sales" with no subtabs favorited under it), it renders as a single indented link -- same as today but grouped.
- When you favorite **subtabs under a category**, the category name automatically appears as a parent header. You don't need to separately favorite the category for it to show.
- If you favorite both a main tab AND subtabs under it, the category header is clickable (navigates to `?tab=sales`) and subtabs nest below it.
- Unfavoriting all items under a category removes that category header automatically.

### Sidebar Visual Hierarchy

| Element | Indentation | Style |
|---|---|---|
| Analytics Hub | `pl-9` (standard nav item) | Normal nav link with icon |
| Category header (e.g., Sales) | `pl-12` | `text-xs font-display uppercase tracking-wide text-muted-foreground`, clickable |
| Subtab shortcut (e.g., Goals) | `pl-14` | `text-xs font-sans` with `ChevronRight` arrow |

Category headers use `font-display` (Termina, uppercase) to visually distinguish them from subtab links which use `font-sans` (Aeonik Pro). This creates a clear parent-child relationship without needing extra icons.

### Files to Modify

**1. `src/components/dashboard/CollapsibleNavGroup.tsx`**
- Replace the flat `analyticsSubLinks.map()` rendering (lines 275-325) with grouped rendering logic
- Group favorites by `tab` field, preserving insertion order of the first item per group
- Render each group as: category header (clickable, navigates to `?tab=X`) followed by subtab links (if any)
- Category-only favorites (subtab is empty) render just the header as a clickable link
- Subtab-only favorites auto-generate a non-starred category header above them

**2. `src/hooks/useAnalyticsSubtabFavorites.ts`**
- Add a `getGroupedFavorites()` helper that returns favorites organized by tab:
  ```
  { tab: "sales", label: "Sales", hasTabFavorite: true, subtabs: [{ subtab: "goals", label: "Goals" }, ...] }
  ```
- Import `baseCategories` labels to resolve the parent category label when only subtabs are favorited (the category label comes from the `analyticsCategories` config, not from the subtab favorite data)
- Export a `ANALYTICS_TAB_LABELS` map so the sidebar can resolve tab IDs to display names

**3. `src/components/dashboard/analytics/SubtabFavoriteStar.tsx`**
- No changes needed -- it already works with both `subtab=""` (main tabs) and specific subtab values

**4. `src/pages/dashboard/admin/AnalyticsHub.tsx`**
- No changes needed -- main tab starring is already wired up

### Data Model

No changes to the stored data shape. The flat array `[{ tab, subtab, label }]` is grouped at render time. This keeps persistence simple and avoids migration.

### Edge Cases

- **Subtab favorited without its parent tab**: The category header appears automatically (derived from the tab ID + a label lookup map). It's clickable but doesn't have a star (it wasn't explicitly favorited).
- **Only a main tab favorited**: Renders as a single clickable link at the category level -- no subtab section below it.
- **MAX_FAVORITES = 6**: Still applies across all favorites combined (main tabs + subtabs). The limit prevents sidebar bloat regardless of hierarchy.
- **Removal**: Unfavoriting via the sidebar star removes only that specific item. If it was the last item under a category, the category header disappears too.

### Technical Detail: Grouping Logic

```text
Input:  [{ tab:"sales", subtab:"", label:"Sales" }, { tab:"sales", subtab:"goals", label:"Goals" }, { tab:"operations", subtab:"staff-utilization", label:"Staff Utilization" }]

Grouped output (ordered by first appearance):
  1. sales -> { tabLabel: "Sales", hasTabFavorite: true, subtabs: [{ subtab:"goals", label:"Goals" }] }
  2. operations -> { tabLabel: "Operations", hasTabFavorite: false, subtabs: [{ subtab:"staff-utilization", label:"Staff Utilization" }] }
```

The grouping preserves insertion order of the first item per tab, so the sidebar reflects the order in which the user added favorites.

