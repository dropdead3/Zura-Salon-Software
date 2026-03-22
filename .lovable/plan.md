

## Convert All Dock Drawers from Bottom-Up to Top-Down

**8 files** need their slide direction flipped. All currently slide up from bottom — they'll now slide down from top.

### 1. `src/components/dock/dock-ui-tokens.ts` — Update DOCK_SHEET token

Change the shared panel token from bottom-anchored to top-anchored:

```
panel: 'absolute inset-x-0 bottom-0 ... rounded-t-2xl border-t' 
→ 'absolute inset-x-0 top-0 ... rounded-b-2xl border-b'
```

Spring physics and drag handle stay the same. Drag dismiss logic flips: drag `y` dismisses when dragged **up** (negative offset/velocity).

### 2. Per-file changes (same pattern in each)

For every drawer/sheet, apply these 4 mechanical changes:

| What | Before | After |
|------|--------|-------|
| Animation | `initial={{ y: '100%' }}`, `exit={{ y: '100%' }}` | `initial={{ y: '-100%' }}`, `exit={{ y: '-100%' }}` |
| Position | `bottom-0` | `top-0` |
| Corners | `rounded-t-2xl` | `rounded-b-2xl` |
| Border | `border-t` | `border-b` |
| Drag dismiss | `offset.y > 120 \|\| velocity.y > 500` | `offset.y < -120 \|\| velocity.y < -500` |
| Drag constraints | `dragConstraints={{ top: 0 }}` | `dragConstraints={{ bottom: 0 }}` |
| Drag handle | stays visually at top of sheet (now the "inner" edge) | moves to **bottom** of sheet content (the edge closest to viewport center) |

### Files to update

1. **`dock-ui-tokens.ts`** — flip `DOCK_SHEET.panel` classes
2. **`DockHamburgerMenu.tsx`** — flip animation + position + drag direction
3. **`DockNewBookingSheet.tsx`** — flip animation + position + drag direction
4. **`DockNewClientSheet.tsx`** — flip animation + position + drag direction
5. **`DockEditServicesSheet.tsx`** — flip animation + position + drag direction
6. **`DockClientQuickView.tsx`** — flip animation + position + drag direction
7. **`DockSessionCompleteSheet.tsx`** — flip animation + position + drag direction
8. **`DockNewBowlSheet.tsx`** — flip animation + position + drag direction
9. **`DockProductPicker.tsx`** — flip animation + position + drag direction (this one is full-screen but still slides from bottom)

All changes are class-level and animation prop swaps. No logic changes.

