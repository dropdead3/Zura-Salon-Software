

# Wire Inventory Lead Assignment into Retail Products Page

## Summary

Add the `InventoryCoverageBanner` and `InventoryLeadAssignmentCard` to the main Retail Products settings page level — between the Online Store status banner and the Tabs — so the coverage warning and lead assignments are visible regardless of which tab is active.

## Changes

### `RetailProductsSettingsContent.tsx`

Insert between the Online Store banner (line ~1707) and the `<Tabs>` block (line ~1709):

```tsx
{/* Inventory Lead Coverage */}
<InventoryCoverageBanner />
<InventoryLeadAssignmentCard />
```

Optionally **remove** the duplicate instances from inside `InventoryByLocationTab` (lines 1398-1404) to avoid showing them twice — or keep them in the Inventory tab for contextual proximity. Recommend removing the duplicates.

## File Plan

| File | Action |
|---|---|
| `RetailProductsSettingsContent.tsx` | Move banner + assignment card to page level; remove from Inventory tab |

Single file, ~6 lines moved.

