

## Move Drag Handle to Bottom of Top-Anchored Sheets

**Problem:** All Dock top-anchored sheets (slide down from top, swipe up to dismiss) have their drag handle bar at the top. The handle should be at the bottom edge of the sheet to visually indicate "swipe up to close."

### Files to update

**1. `src/components/dock/dock-ui-tokens.ts`**
- Rename/add a `dragHandleBottom` token with `mb-3` instead of `mt-3`, positioned at the bottom of the sheet content area

**2. `src/components/dock/mixing/DockNewBowlSheet.tsx`**
- Move the drag handle div from above the header (inside the top `pt-3 pb-4` wrapper) to after the Create button, at the very bottom of the sheet

**3. `src/components/dock/mixing/DockSessionCompleteSheet.tsx`**
- Same: move drag handle from top to bottom of the sheet content

**4. `src/components/dock/schedule/DockNewBookingSheet.tsx`**
- Move the `DOCK_SHEET.dragHandle` div from the top of the panel to the bottom

**5. `src/components/dock/schedule/DockNewClientSheet.tsx`**
- Same: relocate drag handle to bottom

**6. `src/components/dock/mixing/DockProductPicker.tsx`**
- Move drag handle from top to bottom

**7. `src/components/dock/DockHamburgerMenu.tsx`**
- Move drag handle (if present) to bottom of menu

For each file, the handle is moved from above the header/content to below the last content section, just before the closing `</motion.div>`. Styling adjusts from `mt-3` to `mb-3` (or `pt-3` to `pb-3`), and the handle remains the grab target for `dragControls.start(e)`.

Seven files updated, one token adjusted.

