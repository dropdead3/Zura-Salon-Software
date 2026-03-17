

## Make Swatches Read-Only in Organization Backroom Catalog

The organization-side Backroom Product Catalog currently renders an editable `SwatchCell` with a native color picker. Swatches should instead be read-only, sourced from the Zura Platform Supply Library.

### Changes in `BackroomProductCatalogSection.tsx`

1. **Replace the editable `SwatchCell` usage (lines 964-968)** with a simple read-only swatch circle (same as the ghost swatch display but without the click-to-adopt behavior). Both the ghost and non-ghost cases become the same: a static colored circle, or an empty dashed circle if no swatch exists.

2. **The `SwatchCell` component (lines 120-156) can be removed** since it will no longer be used anywhere in this file.

### Resulting swatch cell rendering (lines 955-970):
- If the product has a `swatch_color` or a ghost swatch from the library, display a static filled circle with that color.
- If no swatch exists at all, display a dashed empty circle.
- No click handler, no color picker, no "click to adopt" behavior.

