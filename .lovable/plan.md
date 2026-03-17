

# Enhance Supply Library: Persistent Sub-line State + Collapse All/Expand All + product_line Column

## 1. Persist collapsed/expanded sub-line state in localStorage

In `SupplyLibraryTab.tsx`:
- Replace the `useState<Set<string>>(new Set())` for `collapsedSubLines` with a pattern that reads/writes to `localStorage` under key `supply-library-sublines`.
- On toggle, serialize the Set to JSON and persist. On mount, restore from storage.
- Same treatment for `collapsedCategories` (key: `supply-library-categories`).
- When brand changes (the `setCollapsedSubLines(new Set())` call on line 641), clear the persisted state for that context or scope keys by brand.

## 2. Add "Collapse All / Expand All" toggle at category level

In the brand detail toolbar area (around line 707, after the filter selects):
- Add a small toggle button: "Collapse All" / "Expand All" that sets all category keys and sub-line keys to collapsed or expanded in one action.
- Uses existing `collapsedCategories` and `collapsedSubLines` state — bulk-set all current `categoryGroups` keys into or out of the sets.
- Button label toggles based on whether more sections are open or closed.

## 3. Add `product_line` column to `supply_library_products`

**Database migration:**
- `ALTER TABLE supply_library_products ADD COLUMN product_line TEXT;`
- Backfill using the same extraction logic: `UPDATE supply_library_products SET product_line = ...` via a data update after migration.
- Add index: `CREATE INDEX idx_supply_lib_product_line ON supply_library_products(product_line);`

**Edge: Backfill approach:**
- Since SQL can't easily replicate the JS prefix-matching logic, we run the backfill client-side: fetch all products, apply `extractProductLine(name)`, batch-update via Supabase. Add a "Compute Product Lines" admin action or do it in the seed flow.

**Code changes:**
- Update `useSupplyLibrary.ts` seed mutation to include `product_line` when inserting.
- Update `groupByProductLine` usage in `SupplyLibraryTab.tsx` to prefer `product_line` column when available, falling back to runtime extraction.
- Update `SupplyLibraryProduct` interface to include `product_line: string | null`.

### Files modified
- `src/components/platform/backroom/SupplyLibraryTab.tsx` — localStorage persistence + collapse all/expand all button
- `src/hooks/platform/useSupplyLibrary.ts` — include `product_line` in seed inserts
- `src/lib/supply-line-parser.ts` — no changes (still used as fallback)
- Database migration — add `product_line` column + index

