

# Recently Added Filter + Sync Library Action

## 1. "Recently Added" filter in brand detail toolbar

In `SupplyLibraryTab.tsx`, add a new filter state `recencyFilter` (`'all' | 'recent'`). When set to `'recent'`, filter `brandProducts` to only those where `created_at` is within the last 7 days. Add a small toggle or select next to the existing pricing filter dropdown. This lets admins quickly verify newly seeded catalog entries.

**Implementation:**
- Add state: `const [recencyFilter, setRecencyFilter] = useState<'all' | 'recent'>('all');`
- In the `categoryGroups` memo (~line 143), apply an additional filter when `recencyFilter === 'recent'`:
  ```ts
  if (recencyFilter === 'recent') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    filtered = filtered.filter(p => p.created_at >= sevenDaysAgo);
  }
  ```
- Add a toggle button in the toolbar (near the Collapse All button): "Recently Added" with a clock icon, highlighted when active.

## 2. "Sync Library" action for re-seeding

Add a `useSyncSupplyLibrary` mutation in `useSupplyLibrary.ts` that:
1. Fetches all existing DB product `(brand, name)` pairs
2. Diffs against the static `SUPPLY_LIBRARY` array
3. Inserts only the missing products (with `product_line` populated)
4. Also backfills `product_line` on any existing rows where it's `NULL`
5. Returns `{ inserted, backfilled }` counts

**UI:** In `SupplyLibraryTab.tsx`, add a "Sync Library" button in the header toolbar (next to Export/Import/Add). It uses the sync mutation, shows a loading spinner during execution, and toasts the result. Only visible when the library is already initialized.

### Files modified
- `src/hooks/platform/useSupplyLibrary.ts` — Add `useSyncSupplyLibrary` mutation
- `src/components/platform/backroom/SupplyLibraryTab.tsx` — Add recency filter state + UI toggle, add Sync Library button in header

### No database changes required
Uses existing `created_at` and `product_line` columns.

