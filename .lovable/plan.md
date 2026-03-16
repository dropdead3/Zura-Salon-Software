

# Fix Floating Bottom Banner Alignment

## Problems
1. The bar uses `left-1/2 -translate-x-1/2` which centers it relative to the full viewport, causing it to overlap the left sidebar.
2. It shows both "Est. Savings" and "Net Benefit" — user wants only the net benefit number.

## Changes (`BackroomPaywall.tsx`, lines 994–1065)

### 1. Fix positioning to respect sidebar
Replace `fixed bottom-6 left-1/2 -translate-x-1/2` with positioning that accounts for the sidebar width. The sidebar is `w-56` (224px) when expanded. Use `left-56` (or the sidebar width variable) combined with centering within the remaining space:
- Outer div: `fixed bottom-6 z-50` with `left-56` and `right-0` to span only the content area, then use `flex justify-center` to center the pill within that space.
- Keep `w-auto` on the inner pill so it self-sizes.

### 2. Show only Net Benefit
Remove the "Est. Savings" block (lines 1004–1009). Keep only the Net Benefit value. When not positive, keep the existing Est. Cost / "Select locations" fallback.

### File
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

