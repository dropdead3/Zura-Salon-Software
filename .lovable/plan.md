
# Fix: Move Service Labels to Top of Their Color Bands

## Change
In `DayView.tsx`, change the label positioning from `bottom-0` to `top-0` inside each color band so service names appear at the top of their respective blocks instead of the bottom.

## Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

Change the `span` class from `absolute bottom-0 left-1.5` to `absolute top-0 left-1.5` (around line 466).

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Change `bottom-0` to `top-0` on service label spans inside color bands |
