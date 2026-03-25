

## Enlarge Drag Handle Touch Area Across All Dock Sheets

### Problem
The swipe-to-dismiss target is limited to the tiny 48×6px drag handle pill. On iPad/gloved use this is too small and hard to hit.

### Solution
Two changes in `src/components/dock/dock-ui-tokens.ts`:

1. **`dragHandleWrapperBottom`**: Expand from `'flex justify-center pt-2 pb-4'` to `'flex justify-center pt-4 pb-6 w-full cursor-grab active:cursor-grabbing touch-none'` — makes the entire bottom strip a full-width touch target with increased vertical padding.

2. **`dragHandle`**: Remove `cursor-grab active:cursor-grabbing touch-none` from the pill itself (moved to wrapper). Keep visual styling only.

Then in all 9 sheet files that use the drag handle, move `onPointerDown={(e) => dragControls.start(e)}` from the inner `dragHandle` div to the outer `dragHandleWrapperBottom` div. This makes the entire bottom bar (full width, ~40px tall) the swipe-to-dismiss zone instead of just the small pill.

For `DockBowlActionSheet.tsx` which doesn't use `dragControls` (it uses `onClose` directly), we add an `onPointerDown` or keep it as-is since it's a simple action sheet.

### Files
- `src/components/dock/dock-ui-tokens.ts` — update token classes
- `src/components/dock/DockHamburgerMenu.tsx`
- `src/components/dock/appointment/DockFormulaHistorySheet.tsx`
- `src/components/dock/appointment/DockEditServicesSheet.tsx`
- `src/components/dock/schedule/DockNewClientSheet.tsx`
- `src/components/dock/schedule/DockNewBookingSheet.tsx`
- `src/components/dock/mixing/DockProductPicker.tsx`
- `src/components/dock/mixing/DockNewBowlSheet.tsx`
- `src/components/dock/mixing/DockBowlActionSheet.tsx`
- `src/components/dock/mixing/DockSessionCompleteSheet.tsx`

All changes follow the same pattern: move `onPointerDown` to wrapper div.

