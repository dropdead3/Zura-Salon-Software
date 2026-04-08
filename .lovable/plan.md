

# Fix Dialog Centering Relative to Sidebar — All Surfaces

## Problem

Dialogs (`Dialog`, `AlertDialog`) render at `left: 50%` of the full viewport, ignoring the sidebar. This makes them appear off-center relative to the visible content area. `DialogContent` already has a `--sidebar-offset` CSS variable but `AlertDialogContent` does not, and the offset values need verification.

## Root Cause

1. **`AlertDialogContent`** uses hardcoded `left-[50%]` with no sidebar offset — used in ~98 files across the app.
2. **`DialogContent`** correctly reads `--sidebar-offset` but the collapsed sidebar value (`44px`) doesn't match the actual sidebar margin (`lg:ml-24` = 96px / 2 = 48px).
3. No design token exists to enforce this rule systematically.

## Fix

### File 1: `src/components/ui/alert-dialog.tsx`
- Add `style={{ left: 'calc(50% + var(--sidebar-offset, 0px))' }}` to `AlertDialogPrimitive.Content`
- Remove the `left-[50%]` from the className (since `left` is now set via inline style)

### File 2: `src/components/ui/dialog.tsx`
- Already has the inline style — no change needed (already correct)

### File 3: `src/components/dashboard/DashboardLayout.tsx`
- Fix collapsed sidebar offset from `'44px'` to `'48px'` (half of 96px actual margin)

### File 4: `src/lib/design-tokens.ts`
- Add a `dialog` token group documenting the sidebar-offset centering rule:
```ts
dialog: {
  sidebarOffsetVar: '--sidebar-offset',
  centeringNote: 'All fixed-position dialogs use left: calc(50% + var(--sidebar-offset, 0px)) for sidebar-aware centering',
}
```

This ensures the rule is discoverable and enforced through the token system.

### Files Modified

| File | Change |
|---|---|
| `src/components/ui/alert-dialog.tsx` | Add sidebar-offset inline style, remove hardcoded `left-[50%]` |
| `src/components/dashboard/DashboardLayout.tsx` | Fix collapsed offset `44px` → `48px` |
| `src/lib/design-tokens.ts` | Add `dialog` token group for centering rule |

3 file edits. No migrations. Fixes all dialog centering across the entire app since both `Dialog` and `AlertDialog` are the only two dialog primitives used.

