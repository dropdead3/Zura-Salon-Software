

## Fix: Purple Halo Partially Wrapping Input

### Problem
The client search input in `DockNewBookingSheet.tsx` (line 306) uses `focus:ring-1 focus:ring-violet-500/50` for its focus state. Tailwind's `ring` utility uses `box-shadow`, which can render inconsistently — especially on raw `<input>` elements inside scrollable containers, causing the halo to appear only partially around the pill shape.

### Fix
In `src/components/dock/schedule/DockNewBookingSheet.tsx` line 306, replace the `focus:ring-1 focus:ring-violet-500/50` with a `focus:border` approach that follows the element's border-radius exactly:

**Before:** `focus:outline-none focus:ring-1 focus:ring-violet-500/50`
**After:** `focus:outline-none focus:border-violet-500/50`

This uses the existing `border` property (already set via `border border-[hsl(var(--platform-border))]`) and simply changes its color on focus, which always follows the `rounded-xl` shape perfectly without any clipping issues.

### Files Changed
- `src/components/dock/schedule/DockNewBookingSheet.tsx` — one class change on the search input (line 306)

