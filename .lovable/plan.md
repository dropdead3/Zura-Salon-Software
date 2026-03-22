

## Style-Match Hamburger Menu to Booking Sheet

**Problem:** The hamburger menu panel slides down from the top with `bg-[hsl(var(--platform-bg-elevated))]` and no drag handle, while the booking sheet slides up from the bottom with `bg-[hsl(var(--platform-bg))]`, a drag handle, rounded top corners, and pull-to-dismiss. They should share the same visual language.

### Changes — `src/components/dock/DockHamburgerMenu.tsx`

Convert the menu from a top-sliding panel to a bottom sheet matching `DockNewBookingSheet`:

1. **Slide direction:** Change from `y: '-100%'` (top) to `y: '100%'` (bottom), anchored with `absolute inset-x-0 bottom-0`
2. **Background:** `bg-[hsl(var(--platform-bg-elevated))]` → `bg-[hsl(var(--platform-bg))]` to match booking sheet
3. **Border:** `border-b` → `border-t border-[hsl(var(--platform-border))]`
4. **Corners:** `rounded-b-2xl` → `rounded-t-2xl`
5. **Drag handle:** Add the standard dock drag handle (`mx-auto mt-3 h-1.5 w-12 rounded-full`) at the top
6. **Pull-to-dismiss:** Add `drag="y"` with `useDragControls`, same dismiss threshold (offset 120, velocity 500)
7. **Close button:** Replace the top-right X with an inline close button in the header row (matching booking sheet's `p-1.5 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)]` pattern)
8. **Max height:** Add `maxHeight: '92%'` style to match `DOCK_SHEET.maxHeight`
9. **Keep hamburger trigger** in top-right, but only show the `Menu` icon (no `X` toggle — the sheet itself has a close button and pull-to-dismiss)

### Layout inside the sheet (top to bottom):
- Drag handle
- Header row: "Navigation" title + X close button
- Tab items (same styling, unchanged)
- Divider
- Lock Station button
- Bottom padding for safe area

One file changed. Purely class and animation direction updates + drag handle addition.

