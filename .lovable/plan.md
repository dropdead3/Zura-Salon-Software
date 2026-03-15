

# Anchor Depletion/Billable/Overage Controls to Right Edge

The `ProductRow` component currently wraps the depletion method + billable/overage toggles in a container that flows naturally within a `flex-col sm:flex-row` layout. On wider screens the controls sit after the product info but aren't pinned right — they just float wherever the content ends.

## Change

**File: `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx`** — `ProductRow` component (lines 810–892)

Restructure the row layout so the controls container is pushed to the far right:

1. Make the outer row `flex items-center` with the product info side taking `flex-1 min-w-0` and the controls block using `ml-auto shrink-0`
2. Remove `w-full sm:w-auto` from the controls container — replace with `sm:ml-auto` to anchor right
3. Keep mobile stacking behavior (`flex-col` on small screens) intact

The result: product name/brand/category fills the left, and the "Weighed | Billable | Overage" controls group sits flush-right on desktop — matching the reference screenshot's layout.

