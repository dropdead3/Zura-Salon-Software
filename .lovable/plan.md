

# Reduce Brand Card Corner Radius with Size-Aware Radii

## Problem
`PlatformCard` hardcodes `rounded-2xl` (16px) for all cards. For small brand cards (~150-200px), this is disproportionately large — corners appear bloated relative to card size.

## Solution
Add a `size` prop to `PlatformCard` that controls the border radius, following the project's existing radius hierarchy (L0 `rounded-xl`, L1 `rounded-lg`, L2 `rounded-md`).

### `src/components/platform/ui/PlatformCard.tsx`
- Add `size?: 'lg' | 'md' | 'sm'` prop (default `'lg'`)
- Map sizes to radii:
  - `lg` → `rounded-2xl` (16px) — full-width dashboard cards, modals (current default, no breaking change)
  - `md` → `rounded-xl` (12px) — medium cards, grid items
  - `sm` → `rounded-lg` (8px) — compact tiles, small grid cards
- Replace the hardcoded `rounded-2xl` with the size-derived class

### `src/components/platform/backroom/SupplyLibraryTab.tsx`
- Pass `size="md"` to the brand grid `PlatformCard` instances — drops corners from 16px to 12px, proportionate for the ~200px card size

Two files, minimal changes. All existing PlatformCard usages default to `'lg'` so nothing else breaks.

