

## Plan: Add Pull-Down-to-Dismiss Gesture on Booking Sheet

### Problem
The `DockNewBookingSheet` has a visual drag handle but no actual swipe-down gesture to dismiss. On mobile, users expect to pull down on the handle to close bottom sheets.

### Approach
Use `framer-motion`'s built-in drag gesture on the sheet's `motion.div`. This is the standard pattern for bottom-sheet dismiss and avoids custom touch handlers.

### Changes — `src/components/dock/schedule/DockNewBookingSheet.tsx`

**On the sheet `motion.div` (line 198–206):**
- Add `drag="y"` with `dragConstraints={{ top: 0 }}` and `dragElastic={{ top: 0, bottom: 0.4 }}`
- Add `onDragEnd` handler: if the user drags down past a threshold (~120px) or with enough velocity, call `handleClose()`; otherwise snap back to `y: 0`
- Keep the existing spring animation for enter/exit

```tsx
<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={{ top: 0, bottom: 0.4 }}
  onDragEnd={(_, info) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      handleClose();
    }
  }}
  // ...existing props
>
```

**Scroll conflict prevention:**
- Add `dragListener={false}` on the sheet and attach drag only to the handle area using a `dragControls` ref from framer-motion, so scrolling inside the content area doesn't trigger the dismiss gesture
- Alternatively, limit the drag-to-dismiss to only fire when the scroll container is at `scrollTop === 0`

### No other files affected

