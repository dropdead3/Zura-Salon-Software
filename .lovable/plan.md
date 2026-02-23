

## Fix Floating Batch Bar Placement

### Problems (from screenshot)
1. The bar extends off the right edge of the screen -- "Export CSV" is clipped.
2. The bar overlaps the AI Copilot FAB (bottom-right corner).

### Solution

**`src/components/dashboard/appointments-hub/AppointmentBatchBar.tsx`**

Two adjustments to the `motion.div` className:

1. **Prevent right overflow**: Change `max-w-2xl` to `max-w-xl` so the bar fits comfortably within the viewport. Also add `pr-20` (or equivalent right margin) to account for the FAB, or shift the bar slightly left.

2. **Clear the FAB**: Move the bar up from `bottom-4` to `bottom-20` so it sits above the FAB zone (which lives at `bottom-4 right-4`). Alternatively, keep `bottom-4` but add `right-20` padding so the bar content stops before the FAB. The cleaner approach is `bottom-20` since the FAB is a fixed 56px button at `bottom-4`.

3. **Responsive content**: On smaller viewports, the action buttons should wrap or shrink. Add `flex-wrap` to the actions row so "Update Status", "Share", and "Export CSV" can stack if needed.

### Specific Changes

```
Current:  className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[calc(100%-2rem)] ..."
Updated:  className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[calc(100%-2rem)] ..."
```

- `bottom-4` becomes `bottom-20` -- clears the FAB at bottom-4/right-4
- `max-w-2xl` (672px) becomes `max-w-xl` (576px) -- prevents right-edge clipping on standard viewports

The actions container also gets `flex-wrap` so buttons reflow on narrow screens instead of overflowing.

