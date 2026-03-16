

# Brighten Green & Fix Corner Radius

**File:** `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (lines 626–671)

## Problems

1. **Dull green** — The `success` CSS variable in dark mode is `145 35% 25%` (very dark). All `text-success` and `border-success/*` references look muddy.
2. **Corner mismatch** — Outer wrapper uses `rounded-xl` (20px) with `overflow-hidden`, inner card uses `rounded-[11px]` with `m-px`. The 1px margin creates a visible gap artifact at the corners (visible in the zoomed screenshot).

## Changes

### 1. Use explicit brighter green instead of `success` token (lines 626–671)

Since `--success` is intentionally dark across the design system, this banner should use a custom brighter green via arbitrary Tailwind values. Replace all `success` color references in this banner with a brighter emerald green:

- `text-success` → `text-[hsl(145,50%,55%)]` (bright green, ~55% lightness)
- `text-success/80` → `text-[hsl(145,50%,55%)]/80`
- `text-success/50` → `text-[hsl(145,50%,55%)]/50`
- `bg-success` (dot) → `bg-[hsl(145,50%,55%)]`
- `shadow-[...success...]` (dot glow) → use the same bright hsl
- `from-success/40` → `from-[hsl(145,50%,55%)]/40`
- `via-success/20` → `via-[hsl(145,50%,55%)]/20`
- `from-success/[0.08]` → `from-[hsl(145,50%,55%)]/[0.08]`
- `border-success/15` → `border-[hsl(145,50%,55%)]/15`
- `bg-success/[0.04]` → `bg-[hsl(145,50%,55%)]/[0.04]`
- `hover:bg-success/[0.08]` → `hover:bg-[hsl(145,50%,55%)]/[0.08]`

### 2. Fix corner radius alignment

- Outer wrapper: change `rounded-xl` to `rounded-2xl` (30px) to give more generous rounding
- Inner card: change `rounded-[11px]` to `rounded-[calc(30px-1px)]` or simply `rounded-[29px]` so the inner radius perfectly follows the outer minus the 1px border gap
- This eliminates the visible corner artifact

### Summary

Two classes of changes in one file — brighter explicit green HSL values throughout the banner, and matched outer/inner border radii to fix the corner shape.

