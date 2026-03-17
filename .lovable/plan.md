

# Full Product Review Before Import

## Problem
The review phase only shows the first 10 products per brand, then "... and 140 more". You can't inspect the full list before committing.

## Changes

### `src/components/platform/backroom/BulkCatalogImport.tsx`

1. **Remove the 10-item cap** in the collapsed product list (lines 725-742):
   - Show ALL products when the brand is expanded, not just `slice(0, 10)`
   - Remove the "... and X more" text
   - Wrap the product list in its own inner `ScrollArea` with a max height (~300px) so very large brands (150+ products) don't blow out the dialog

2. **Add "Expand All / Collapse All" toggle** in the review phase header area (near line 633):
   - Small button that expands or collapses all brand product lists at once
   - Makes it easy to quickly audit everything

3. **Add per-brand product count in expanded view header** — already present, no change needed

### Result
- Every product is visible and scrollable before clicking "Confirm & Import"
- Large catalogs stay contained in a scrollable sub-region
- "Expand All" lets you open every brand at once for a full audit

