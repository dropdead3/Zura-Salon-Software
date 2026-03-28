

## Problem

The pin icon on analytics cards (`CommandCenterVisibilityToggle`) only updates the `dashboard_element_visibility` table but does not update the user's `dashboard_layout` (which tracks `pinnedCards` and `sectionOrder`). This means:

1. Pinning via the card icon doesn't show the card as toggled on in the Dashboard Customizer
2. The pin icon doesn't reflect the card's actual pinned state from the layout
3. Unpinning via the card icon doesn't remove it from the customizer either

The customizer's `handleTogglePinnedCard` already does both — it updates visibility AND layout. The card-level pin icon needs the same dual-write behavior.

## Plan

### 1. Update `CommandCenterVisibilityToggle` to also update `dashboard_layout`

**File:** `src/components/dashboard/CommandCenterVisibilityToggle.tsx`

- Import `useDashboardLayout`, `useSaveDashboardLayout`, `isPinnedInLayout`, `toPinnedEntry`, `getPinnedVisibilityKey` from the layout hook
- Derive `isVisibleToLeadership` from BOTH the visibility table AND the layout's `pinnedCards` (union of both sources, matching how the customizer's `isCardPinned` works)
- In `handleToggle`, after upserting visibility rows, also mutate the layout:
  - **Pin:** Add `cardId` to `pinnedCards` and `pinned:{cardId}` to `sectionOrder`
  - **Unpin:** Remove from both `pinnedCards` and `sectionOrder`
- Remove debug `fetch` logging calls (cleanup)

### 2. Clean up debug logging

Remove all the `#region agent log` fetch calls from `CommandCenterVisibilityToggle.tsx` that were left from prior debugging sessions.

## Technical Details

The key change is in `handleToggle` — after the existing visibility upsert, add layout sync:

```typescript
// After visibility upsert succeeds...
const currentLayout = layoutData; // from useDashboardLayout
if (checked) {
  const pinnedEntry = toPinnedEntry(elementKey);
  const newPinnedCards = [...new Set([...(currentLayout.pinnedCards || []), elementKey])];
  const newSectionOrder = [...(currentLayout.sectionOrder || []), pinnedEntry]
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe
  saveLayout.mutate({ ...currentLayout, pinnedCards: newPinnedCards, sectionOrder: newSectionOrder });
} else {
  const pinnedEntry = toPinnedEntry(elementKey);
  const newPinnedCards = (currentLayout.pinnedCards || []).filter(id => id !== elementKey);
  const newSectionOrder = (currentLayout.sectionOrder || []).filter(id => id !== pinnedEntry);
  saveLayout.mutate({ ...currentLayout, pinnedCards: newPinnedCards, sectionOrder: newSectionOrder });
}
```

The pin icon's visual state (`isVisibleToLeadership`) will also check `isPinnedInLayout(layout, elementKey)` so it correctly reflects pinned state from either source.

