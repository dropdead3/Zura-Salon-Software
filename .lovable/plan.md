

# Scope localStorage Collapse Keys by Brand

## What's already done
- **Backfill Product Lines**: Already handled by the existing "Sync Library" button (`useSyncSupplyLibrary` backfills `product_line` on NULL rows).
- **Recently Added filter**: Already implemented with 7-day window.

## What needs changing
The only remaining enhancement: scope `localStorage` keys by brand so collapse state is preserved per-brand instead of being cleared on every brand switch.

### Current behavior (line 672)
When selecting a brand, the code clears both sets and removes the global localStorage keys — meaning all collapse state is lost.

### New behavior
- **Keys**: `supply-library-categories::${brand}` and `supply-library-sublines::${brand}`
- **On brand select**: Load that brand's persisted state from localStorage (or empty Set if none)
- **On collapse toggle**: Persist to the brand-scoped key
- **Remove**: The `localStorage.removeItem` calls on brand click and the global key pattern

### File: `src/components/platform/backroom/SupplyLibraryTab.tsx`

1. **Initial state loaders** (lines 66-77): Change to read from brand-scoped keys. Since `selectedBrand` starts as `null`, initialize as empty Sets (no brand = no persisted state).

2. **Persistence effects** (lines 80-85): Add `selectedBrand` as dependency, write to `supply-library-categories::${selectedBrand}` and `supply-library-sublines::${selectedBrand}`. Skip write when `selectedBrand` is null.

3. **Brand card click handler** (line 672): Instead of clearing and removing, load from the new brand's scoped keys:
   ```ts
   onClick={() => {
     setSelectedBrand(b.brand);
     setProductSearch(''); setCategoryFilter('all');
     // Load brand-scoped collapse state
     try {
       const cats = localStorage.getItem(`supply-library-categories::${b.brand}`);
       setCollapsedCategories(cats ? new Set(JSON.parse(cats)) : new Set());
       const subs = localStorage.getItem(`supply-library-sublines::${b.brand}`);
       setCollapsedSubLines(subs ? new Set(JSON.parse(subs)) : new Set());
     } catch { setCollapsedCategories(new Set()); setCollapsedSubLines(new Set()); }
   }}
   ```

4. **Back button handlers** (lines 551, 565): Just reset to empty sets (no persistence needed when no brand selected).

### No other files modified

