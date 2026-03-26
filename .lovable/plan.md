

## Configure Allowance & Product Allowance Calculator — Gap Analysis (Round 5)

After four rounds of improvements, the dialog is at 1,654 lines and the ServiceTrackingSection at 1,067 lines. Reviewing all logic, state management, save flow, picker, footer, and integration points.

---

### Bugs

**1. Query cache thrashing during save (P1)**
Each `upsertBaseline.mutateAsync()` call triggers `queryClient.invalidateQueries({ queryKey: ['service-recipe-baselines'] })` in the hook's `onSuccess`. For a recipe with 8 products across 2 bowls, this fires 16 invalidation + refetch cycles during the save loop. The `upsertBowl.mutateAsync()` hook similarly invalidates `['allowance-bowls']` per bowl. This causes unnecessary network traffic and potential UI flicker if the dialog re-renders mid-save.

**Fix:** Bypass the mutation hooks during `handleSave` and use raw supabase calls for the batch insert loop (already done for deletes). Call `queryClient.invalidateQueries` once at the end after all inserts complete.

**2. `useEffect` dependency causes bowls to reset on catalog load (P1)**
Line 278: `useEffect` depends on `[open, existingBowls, existingBaselines, catalogProducts]`. When the dialog opens, `catalogProducts` may load after bowls/baselines, triggering the effect a second time. If the user has already started editing (added a product), the state resets to the loaded baselines.

**Fix:** Add a `hasInitialized` ref that prevents re-running the initialization after the first successful load within an `open` session.

**3. Undo refs are stale after state updates (P2)**
`removedBowlRef` and `removedLineRef` capture closure state at removal time. If the user removes item A, then removes item B, then clicks "Undo" on A, the undo restores A using stale bowl state. Only the most recent removal can be undone reliably, but the UI shows undo toasts for all removals.

**Fix:** Dismiss previous removal toasts when a new removal occurs (`toast.dismiss(previousToastId)`), or use an undo stack instead of single refs.

---

### Performance

**4. Expensive inline computations in render (P2)**
Lines 1162–1169: The "Also in Bowl X" badge runs `bowls.findIndex(...)` for every color line on every render. Lines 1185–1191: Finding the catalog product for wholesale cost display also runs per-line per-render. With 20+ lines, this is O(n×m) per render.

**Fix:** Pre-compute a `productToBowlMap` and a `productCostMap` in `useMemo` outside the render loop.

**5. `catalogProducts` query fetches up to 2000 rows per dialog open (P2)**
The products query runs every time the dialog opens (`enabled: !!orgId && open`). For salons with large catalogs, this is a heavy fetch on every calculator open.

**Fix:** Add `staleTime: 120_000` (2 min) to the catalog query so repeated opens reuse cached data.

---

### UX Polish

**6. No keyboard shortcut to save (P2)**
The dialog supports `Escape` to close but has no `Cmd+S` / `Ctrl+S` to save. Users familiar with keyboard shortcuts expect this in an editor-style dialog.

**Fix:** Add a `useEffect` with `keydown` listener for `Cmd+S` / `Ctrl+S` that calls `handleSave` when `grandTotal > 0 && !saving`.

**7. Product picker search doesn't persist when navigating back (P2)**
When a user searches in the brand step, navigates to a category, then clicks back, the search is reset to empty (line 689/715 clears search on step change). Users may want to refine their search after drilling down.

**Fix:** Keep search value when navigating back to a parent step (only clear search on forward navigation).

**8. No confirmation before applying suggested price (P2)**
Both "Use $X suggested price" buttons (high/low health) directly mutate the database. While an undo toast is shown, accidental clicks on a destructive price change should have a brief confirmation or at minimum a more prominent undo mechanism.

**Fix:** Show a brief confirmation popover ("Change service price from $X to $Y?") before executing the mutation.

**9. Developer lines don't show "No cost data" warning (P1)**
The zero-cost warning badge (lines 1173–1184) only appears in color lines. Developer products with `costPerGram === 0` silently contribute $0.00, which is equally problematic.

**Fix:** Add the same "No cost data" badge to the developer line render block (~line 1269).

**10. Cross-bowl indicator missing in developer lines (P2)**
The "Also in Bowl X" badge only renders for color lines (1162–1169). Developer products used in multiple bowls don't show this indicator.

**Fix:** Add the same cross-bowl check to the developer line render.

---

### Summary

| Priority | # | Change | Scope |
|----------|---|--------|-------|
| P1 | 1 | Batch invalidation — raw inserts in handleSave | AllowanceCalculatorDialog.tsx |
| P1 | 2 | Guard against re-initialization on catalog load | AllowanceCalculatorDialog.tsx |
| P1 | 9 | Zero-cost warning on developer lines | AllowanceCalculatorDialog.tsx |
| P2 | 3 | Dismiss stale undo toasts | AllowanceCalculatorDialog.tsx |
| P2 | 4 | Pre-compute product maps for render perf | AllowanceCalculatorDialog.tsx |
| P2 | 5 | Add staleTime to catalog query | AllowanceCalculatorDialog.tsx |
| P2 | 6 | Cmd+S keyboard shortcut to save | AllowanceCalculatorDialog.tsx |
| P2 | 7 | Preserve search on picker back-navigation | AllowanceCalculatorDialog.tsx |
| P2 | 8 | Confirmation before suggested price apply | AllowanceCalculatorDialog.tsx |
| P2 | 10 | Cross-bowl indicator on developer lines | AllowanceCalculatorDialog.tsx |

### Technical Approach

- **Item 1**: Replace `upsertBaseline.mutateAsync()` / `upsertBowl.mutateAsync()` in handleSave with direct `supabase.from(...).insert(...)` calls. Single `queryClient.invalidateQueries` at end of save.
- **Item 2**: Add `const hasInitRef = useRef(false)` — set to `true` after first initialization, reset to `false` when `open` becomes `false`.
- **Items 4**: Create `const productBowlMap = useMemo(...)` mapping `productId → bowlLabel[]` and `const wholesaleCostMap = useMemo(...)` mapping `productId → wholesaleCpg`.
- **Items 9–10**: Duplicate the "No cost data" badge and cross-bowl badge logic into the developer lines render block.

