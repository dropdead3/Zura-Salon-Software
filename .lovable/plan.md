

## Add Post-Sync Summary Toast

### Changes to `BackroomProductCatalogSection.tsx`

Both sync mutations already return an `updated` count but only show "Synced N products". Enhance them to also track how many were already complete (skipped), then show a richer toast.

#### 1. Change return type of both `mutationFn`s
Return `{ updated: number, skipped: number, total: number }` instead of just a count.

- `skipped` = products that matched a library item but had no null fields to fill
- `total` = all org products checked

#### 2. Update `onSuccess` toast messages
Replace the simple `toast.success` with a summary:
- **If updated > 0**: `"Synced {updated} of {total} products from Zura Library. {skipped} already up to date."`
- **If updated === 0**: `"All {total} products already up to date — nothing to sync."`

This applies to both `syncFromLibraryMutation` (per-brand) and `syncAllBrandsMutation` (all brands).

