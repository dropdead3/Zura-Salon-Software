

# Hide "+Add Brand" button when inside a brand detail view

Single change in `src/components/platform/backroom/SupplyLibraryTab.tsx`.

## Change

Wrap the "+Add Brand" button (line 649-651) with a `!selectedBrand &&` conditional so it only renders on the Level 1 brand grid, not when drilled into a brand's product list.

```tsx
{!selectedBrand && (
  <PlatformButton size="sm" variant="outline" onClick={() => setAddBrandOpen(true)}>
    <Plus className="w-3.5 h-3.5 mr-1" /> Add Brand
  </PlatformButton>
)}
```

### File modified
- `src/components/platform/backroom/SupplyLibraryTab.tsx` — line 649

