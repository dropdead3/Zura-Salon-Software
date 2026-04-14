

## Problem

The auto-play progress bar sits inside the phone screen (`absolute bottom-4 inset-x-4`), overlapping content like the "THANK YOU FOR YOUR VISIT!" text and the "NOT BRANDABLE" badge on the success screen.

## Solution

Move the progress bar outside the phone bezel, positioning it between the phone frame and the stage dots.

### Changes

**File:** `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx`

1. **Move the progress bar block** (lines 451–459) from inside the phone container (`absolute bottom-4`) to after the phone container closes (after line 468), placing it between the phone frame and the stage dots.
2. **Change styling** from `absolute bottom-4 inset-x-4` to a normal-flow element: `w-full mt-3 h-[2px] rounded-full bg-muted/40 overflow-hidden` — matching the muted aesthetic outside the dark phone screen.
3. **Update the fill color** from `p.accentRgba(0.5)` to `p.accentColor` at reduced opacity for better visibility against the card background.

