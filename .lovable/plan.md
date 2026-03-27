

## Fix: Product Allowance Calculator Padding Loss on Tablet/Mobile

### Problem
The dialog (`DialogContent className="max-w-5xl max-h-[90vh] p-0"`) uses `p-0` globally, then relies on inner sections to provide their own padding. On tablet/mobile, certain areas lose padding — particularly the left panel, footer, and health indicator strip — because the responsive stacking (`md:flex-row` → `flex-col`) doesn't adjust spacing for narrower widths.

### Changes (single file)
**`src/components/dashboard/color-bar-settings/AllowanceCalculatorDialog.tsx`**

1. **Left panel (line ~1134):** Currently `p-4`. At mobile widths the panel stretches full-width but `p-4` (16px) feels cramped against a near-full-screen dialog. Change to `px-4 py-4 sm:px-5` so small screens get comfortable side padding.

2. **Right panel / recipe area:** Find the matching right panel div and ensure it also carries `px-4 py-4 sm:px-5` instead of bare `p-4`.

3. **Footer (line ~1661):** Currently `px-6 py-4`. On small screens this is fine horizontally, but the content inside (`flex-wrap items-start justify-between`) should stack vertically on narrow widths. Change footer inner to `flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4` so the "Save Allowance" button and health indicators don't crunch together.

4. **Header (line ~1109):** Currently `px-6 pt-5 pb-4` — this is adequate but should be `px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4` to keep proportional on small screens.

5. **Footer Save button area (line ~1767):** The `flex flex-col items-end` block should become full-width on mobile with the button spanning `w-full sm:w-auto` so it's a proper touch target.

### Summary
- Header: responsive padding (`px-4 → sm:px-6`)
- Left panel: responsive padding
- Right panel: responsive padding  
- Footer: stack vertically on mobile, full-width save button
- No structural or logic changes — padding/layout only

