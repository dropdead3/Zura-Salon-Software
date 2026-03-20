

## Add Pull-to-Dismiss and Tap-Outside-to-Close to All Dock Drawers

### Current State

Some drawers already have proper gesture handling (DockNewBookingSheet, DockNewClientSheet use framer-motion drag + backdrop tap). Three drawers are missing these interactions:

| Drawer | Tap Outside | Pull to Dismiss |
|--------|------------|-----------------|
| DockNewBowlSheet | ✅ (overlay click) | ❌ |
| DockSessionCompleteSheet | ✅ (overlay click) | ❌ |
| DockProductPicker | ❌ (full-screen, no overlay) | ❌ |

### Changes

**1. `src/components/dock/mixing/DockNewBowlSheet.tsx`**

Convert from static div to framer-motion `AnimatePresence` + `motion.div` pattern matching DockNewBookingSheet:
- Add `useDragControls()` from framer-motion
- Wrap in `AnimatePresence`, add slide-up animation (`y: '100%'` → `y: 0`)
- Add `drag="y"` with `dragConstraints` and `dragElastic` on the sheet panel
- Add draggable handle bar (`onPointerDown` → `dragControls.start`)
- `onDragEnd`: close if `offset.y > 120 || velocity.y > 500`
- Backdrop gets animated opacity + `onClick={onClose}`

**2. `src/components/dock/mixing/DockSessionCompleteSheet.tsx`**

Same conversion — add framer-motion drag-to-dismiss and animated backdrop:
- Add `useDragControls()`, `AnimatePresence`, slide-up animation
- Draggable handle bar on the sheet
- `onDragEnd` close threshold

**3. `src/components/dock/mixing/DockProductPicker.tsx`**

This is a full-screen picker (not a bottom sheet), so pull-to-dismiss works differently:
- Add a drag handle bar at the top
- Add `drag="y"` with constraints allowing only downward drag
- `onDragEnd`: close if dragged down enough
- Add a subtle backdrop behind it for tap-outside consistency (or keep the X button as primary since it's full-screen)

All three files adopt the same spring config and drag thresholds already used in `DockNewBookingSheet` and `DockNewClientSheet` for consistency.

