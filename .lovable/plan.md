

# Undo/Remove Entire Brand — After Add

## Approach
After `handleAddEntireBrand` succeeds, show a toast with an **Undo** action button. Clicking it deletes all the products that were just inserted. This uses Sonner's built-in `action` prop on the success toast.

## Implementation

### Both files: `BackroomProductCatalogSection.tsx` and `SupplyLibraryDialog.tsx`

In each `handleAddEntireBrand`, after the successful insert:

1. Collect the inserted product names into an array (already have `itemsToInsert`)
2. Replace the simple `toast.success(...)` with a toast that includes an `action` button:

```ts
const insertedNames = itemsToInsert.map(i => i.name);
toast.success(`Added ${insertedNames.length} ${brand} products`, {
  action: {
    label: 'Undo',
    onClick: async () => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('organization_id', orgId)
        .eq('brand', brand)
        .in('name', insertedNames);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['backroom-product-catalog'] });
        queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success(`Removed ${insertedNames.length} ${brand} products`);
      }
    },
  },
  duration: 8000,
});
```

3. The undo toast stays visible for 8 seconds (longer than default) to give users time to react.

### Files changed
- `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` — update toast in `handleAddEntireBrand`
- `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx` — same change

No new components, no schema changes. Two small edits.

