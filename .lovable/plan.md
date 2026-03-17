

## Add "Track" Column Header

The first `<TableHead>` at line 877 (`w-8`, empty) is the column for the tracking toggle. Simply add the label "Track" to it.

### Change

In `BackroomProductCatalogSection.tsx`, line 877:

**Before:**
```tsx
<TableHead className="w-8" />
```

**After:**
```tsx
<TableHead className="w-8 font-sans text-xs">Track</TableHead>
```

Single line change, no other files affected.

