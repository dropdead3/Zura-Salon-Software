

## Add "Brands Carried In [Location]'s Backroom" Label

### Change

Add a heading label above the brand card grid in `BackroomProductCatalogSection.tsx` that reads **"Brands Carried In [Location Name]'s Backroom"**, using the currently selected location name.

### Implementation

**File:** `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx`

1. Derive the location name from existing state:
   ```tsx
   const effectiveLocationName = activeLocations.find(l => l.id === effectiveLocationId)?.name ?? 'Your Location';
   ```

2. Insert a label above the brand grid (before line ~1428, after the empty-state checks):
   ```tsx
   <p className="text-sm font-sans text-muted-foreground mb-3">
     Brands Carried In {effectiveLocationName}'s Backroom
   </p>
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
   ```

### Scope
- Single file, ~3 lines added
- No database or component changes

