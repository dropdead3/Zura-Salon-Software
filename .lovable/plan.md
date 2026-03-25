

## Verify & Fix: Drawer Handle Swipe-Up Dismiss + Haptic Feedback

### Issues Found

**1. Two sheets have non-functional drag handles** — missing `onPointerDown` + `dragControls`:
- `DockFormulaHistorySheet.tsx` — drag handle is purely decorative (no `useDragControls`, no `onPointerDown`, no `drag` prop on panel)
- `DockHamburgerMenu.tsx` — same issue: drag handle exists visually but isn't wired to `dragControls`

**2. No haptic feedback on any sheet dismiss** — none of the `onDragEnd` handlers call `navigator.vibrate()` when the swipe threshold is met

### Sheets that ARE working (have `dragControls` + `onPointerDown` on handle):
- `DockNewBowlSheet` ✅
- `DockEditServicesSheet` ✅
- `DockProductPicker` ✅
- `DockSessionCompleteSheet` ✅
- `DockNewBookingSheet` ✅
- `DockNewClientSheet` ✅

### Fix

**1. `DockFormulaHistorySheet.tsx`**
- Import `useDragControls` from framer-motion
- Add `drag="y"`, `dragControls`, `dragConstraints`, `dragElastic`, and `onDragEnd` to the panel `motion.div`
- Wire `onPointerDown={(e) => dragControls.start(e)}` to the drag handle div

**2. `DockHamburgerMenu.tsx`**
- Already has `drag="y"` and `onDragEnd` on the panel — but the handle div is missing `onPointerDown`
- Import `useDragControls`, add `dragControls` to the panel, wire handle's `onPointerDown`

**3. Add haptic feedback to ALL sheet `onDragEnd` dismiss handlers** (8 files total)
- In each `onDragEnd` callback, add `try { navigator.vibrate?.(15); } catch {}` right before calling `onClose()` / `handleClose()`
- Files: `DockNewBowlSheet`, `DockEditServicesSheet`, `DockProductPicker`, `DockSessionCompleteSheet`, `DockNewBookingSheet`, `DockNewClientSheet`, `DockFormulaHistorySheet`, `DockHamburgerMenu`

### Summary — 8 files touched
All dock sheets get consistent: functional drag handle → swipe-up dismiss → haptic pulse on dismiss.

