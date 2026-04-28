## Change

Cap the **Simple view** dashboard at the first **6 pinned analytics cards** (display order). The **Detailed view** continues to render all pinned cards. When an operator has more than 6 pinned, the Customize drawer surfaces a tip inside the Analytics section explaining the cap, with a clear hint that reordering controls which 6 appear.

The cap applies to leadership viewers only (existing visibility filter is preserved upstream).

## Files & edits

**1. `src/pages/dashboard/DashboardHome.tsx`** — apply the cap

After `visiblePinnedCardIds` is computed:

```tsx
const SIMPLE_VIEW_CARD_LIMIT = 6;
const renderedPinnedCardIds = compactView
  ? visiblePinnedCardIds.slice(0, SIMPLE_VIEW_CARD_LIMIT)
  : visiblePinnedCardIds;
```

Then swap the two render sites:
- Compact branch (line ~924): `visiblePinnedCardIds.map(...)` → `renderedPinnedCardIds.map(...)`
- Detailed branch (line ~936): the `while` loop iterates `visiblePinnedCardIds` — leave as-is so Detailed still shows everything.

`hasVisiblePinnedAnalytics` continues to gate on the unfiltered count so the section never disappears when at least one card is pinned.

**2. `src/components/dashboard/DashboardCustomizeMenu.tsx`** — surface the tip in the Customize drawer

Inside the existing Analytics section header block (where `PINNED CARDS (n)` is rendered), when `orderedPinnedCardIds.length > 6`, render an inline tip immediately below the count:

```tsx
{orderedPinnedCardIds.length > 6 && (
  <div className="mt-2 mb-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
    <p className="text-[11px] font-sans text-foreground/80 leading-snug">
      Simple view shows the first <span className="font-medium text-foreground">6</span> pinned cards
      ({orderedPinnedCardIds.length - 6} hidden in Simple). Drag to reorder which appear first,
      or switch to Detailed view to see all {orderedPinnedCardIds.length}.
    </p>
  </div>
)}
```

Tip uses semantic tokens only (`bg-primary/5`, `border-primary/15`, `text-foreground/80`) — no hardcoded colors, follows design-token discipline.

## Why this shape

- Cap is a render-time slice, not a layout mutation. Nothing is unpinned in storage; switching to Detailed instantly restores the full set. Reversible, non-destructive.
- Tip lives in the Customize drawer (the surface where the operator decides what's pinned), not on the dashboard itself — keeps the dashboard quiet (per silence-as-valid-output doctrine) and surfaces the constraint exactly where the user can act on it.
- Display order is the lever — drag handles already exist on each pinned card row, so the tip directly maps to existing controls.
- Limit lives as a single named constant (`SIMPLE_VIEW_CARD_LIMIT = 6`) for future tuning.

## Out of scope

- No persistence changes. No DB migration.
- No change to Detailed view layout.
- No change to which cards are pinned — the operator's full pinned set is preserved.
- No toast or banner on the dashboard surface itself.
