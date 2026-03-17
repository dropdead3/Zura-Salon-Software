

# Add A-Z Alphabet Selector to Supply Library Brand Grid

Add a horizontal letter selector bar between the search input and the brand card grid, matching the pattern already used in the Backroom Product Catalog.

## Changes

**`src/components/platform/backroom/SupplyLibraryTab.tsx`**

1. **Compute available letters** — derive a `Set<string>` of first-letters from `filteredBrands` (or `brandCards` for showing all letters with active/inactive styling).

2. **Add `activeLetter` state** (`string | null`, default `null` meaning "show all"). Selecting a letter filters `filteredBrands` to only brands starting with that letter. Clicking the active letter again deselects it (back to all).

3. **Render A-Z bar** — a `flex flex-wrap gap-1` row of small buttons (A through Z plus an "All" button). Each letter button:
   - Active letter: `bg-violet-600 text-white`
   - Has brands: `text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-hover))]`
   - No brands for that letter: `text-[hsl(var(--platform-foreground-muted))] opacity-40 cursor-default`

4. **Placement**: After the search input, before the brand grid. The search input and letter selector work together — search narrows brands, letters further filter by first character.

5. **Reset behavior**: When `brandSearch` changes, reset `activeLetter` to null. When navigating back from a brand detail view, `activeLetter` persists.

Single file edit, no new components or hooks needed.

