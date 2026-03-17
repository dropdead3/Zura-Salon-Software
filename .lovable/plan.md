

## Sort Categories Alphabetically

Both the platform and organization sides will sort categories alphabetically, removing the priority-based ordering.

### Changes

**1. `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx`**
- Already sorts alphabetically — no change needed.

**2. `src/components/platform/backroom/SupplyLibraryTab.tsx`**
- Replace the priority-based `CATEGORIES` sort with a simple `.sort((a, b) => a[0].localeCompare(b[0]))` on the grouped entries, matching the org side.
- The `CATEGORIES` constant can be removed or kept only for reference.

