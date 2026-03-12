

# Fix Padding & Enhance Inventory Leads UI

## Issues (from screenshot)

1. **Missing spacing** between `InventoryCoverageBanner`, `InventoryLeadAssignmentCard`, and `InventoryByLocationTab` — they stack with no gap.
2. **Card content padding** — location rows need slightly more breathing room.

## Changes

### 1. `RetailProductsSettingsContent.tsx` — Add `space-y-6` wrapper

Wrap the three inventory-tab children in a `div` with `space-y-6` so they have consistent vertical spacing:

```tsx
<TabsContent value="inventory" className="mt-4">
  <div className="space-y-6">
    <InventoryCoverageBanner />
    <InventoryLeadAssignmentCard />
    <InventoryByLocationTab />
  </div>
</TabsContent>
```

### 2. `InventoryLeadAssignmentCard.tsx` — Polish

- `CardContent` spacing: `space-y-2` → `space-y-3` for more room between location rows.
- Location rows: increase vertical padding `py-3` → `py-3.5` for a more spacious feel.
- Coverage banner: bump `mb-0` → integrated via parent `space-y-6`.

| File | Action |
|---|---|
| `RetailProductsSettingsContent.tsx` | Wrap inventory tab content in `space-y-6` div |
| `InventoryLeadAssignmentCard.tsx` | Increase row spacing (`space-y-3`, `py-3.5`) |

