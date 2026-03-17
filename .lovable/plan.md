
Root cause: the swatch data is already in the database, but the UI is intentionally hiding it for that category.

What I found:
- All 27 active Danger Jones `semi-permanent` products already have `swatch_color` populated.
- The product table only shows the swatch column when `showSwatch` is true in `SupplyLibraryTab.tsx`.
- `showSwatch` depends on `SHADE_SORTED_CATEGORIES.has(category)`.
- `SHADE_SORTED_CATEGORIES` currently only includes `color` and `toner` in `src/lib/shadeSort.ts`.
- Because `semi-permanent` is excluded, the app hides:
  - the swatch column
  - missing-swatch health logic
  - auto-assign / re-analyze swatch actions

Why this is happening:
- This is not a data problem.
- It is a category-classification problem in the UI.
- The semi-permanents were updated in the backend, but the frontend still treats `semi-permanent` as a non-swatch category.

Implementation plan:
1. Treat `semi-permanent` as a swatch-bearing category
   - Add `semi-permanent` to `SHADE_SORTED_CATEGORIES` so the table renders swatches for that category.

2. Make the category first-class in the admin UI
   - Add `semi-permanent` to the category label map in `professional-supply-library.ts`.
   - Add `semi-permanent` to category option arrays used in the Supply Library admin screens so the category is consistent everywhere.

3. Reuse existing swatch behavior
   - No new swatch UI is needed.
   - The existing `SwatchPicker`, auto-assign, and health indicators should start working automatically once the category is included.

4. Verify the affected view
   - Open Danger Jones → Semi-Permanent in the Backroom Supply Library.
   - Confirm the left swatch column appears.
   - Confirm existing saved swatches render immediately.
   - Confirm “Clear” stays transparent and other vivid shades display their saved colors.

Technical notes:
- Relevant files:
  - `src/lib/shadeSort.ts`
  - `src/components/platform/backroom/SupplyLibraryTab.tsx`
  - `src/data/professional-supply-library.ts`
  - `src/components/platform/backroom/AddBrandWizard.tsx`
- No backend or database changes are needed for this fix.
- The current DB state already supports the feature; this is a frontend rules mismatch.
