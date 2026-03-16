

# Replace Scale Icon with Weight Icon

The current `Scale` icon from Lucide renders as a **balance/justice scale** — not appropriate for a precision weighing scale used in a salon backroom. 

## Change

Replace `Scale` with `Weight` from lucide-react in two files:

### 1. `src/components/dashboard/backroom-settings/BackroomCheckoutConfirmDialog.tsx`
- Line 3: Change import from `Scale` to `Weight`
- Line 70: `<Weight>` for scales license row
- Line 107: `<Weight>` for one-time hardware row

### 2. `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`
- Line 8: Change import from `Scale` to `Weight`
- Line 706, 732: Feature tabs ("Smart Mixing")
- Line 815: Badge in the mixing demo
- Line 1083: Scales config section icon

All other `Scale` references (variable names like `scaleCount`, `SCALE_HARDWARE_PRICE`) are unaffected — only the icon component swaps.

