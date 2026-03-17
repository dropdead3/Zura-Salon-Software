

## Logo Not Filling the Logo Area

The logo container on the organization brand cards is `w-10 h-10` (40px) with `p-1` (4px) internal padding and `object-contain`, which means the actual logo renders in roughly a 32x32px area -- making it look undersized relative to the rounded-lg background box.

The platform side uses `p-0.5` instead of `p-1`, giving the logo slightly more room. To better match the screenshot reference (where the logo fills the box more fully):

### Change in `BackroomProductCatalogSection.tsx` (line 1163)

- Increase the logo container from `w-10 h-10` to `w-12 h-12` (48px)
- Reduce padding from `p-1` to `p-0.5`
- Also update the fallback initial box (line 1166) to `w-12 h-12`

This gives the logo ~44px of usable space instead of ~32px, matching the visual weight shown in the screenshot.

