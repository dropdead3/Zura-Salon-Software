

# Fix Dialog Z-Index — Overlays Must Render Above Sidebar

## Problem
The sidebar uses `z-[60]`. All dialog overlays and content use `z-50`. This causes the sidebar to punch through dialogs, blocking content and looking broken.

## Fix
Bump the z-index on all three overlay primitives from `z-50` to `z-[70]` so they render above the sidebar (`z-[60]`). Three files, same one-line change in each.

### 1. `src/components/ui/dialog.tsx`
- **DialogOverlay**: `z-50` → `z-[70]`
- **DialogContent**: `z-50` → `z-[70]`

### 2. `src/components/ui/alert-dialog.tsx`
- **AlertDialogOverlay**: `z-50` → `z-[70]`
- **AlertDialogContent**: `z-50` → `z-[70]`

### 3. `src/components/ui/sheet.tsx`
- **SheetOverlay**: `z-50` → `z-[70]`
- **SheetContent**: `z-50` → `z-[70]`

## Why z-[70]
The sidebar is `z-[60]`. The lock screen is `z-[100]`. Placing overlays at `z-[70]` sits them above navigation but below critical security surfaces like the lock screen.

No other files need changes — all dialogs, alert dialogs, and sheets across the app inherit from these three primitives.

