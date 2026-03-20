

## Fix: Contain All Mixing Overlays Within the Device Viewer Frame

### Problem

Three mixing-related overlays use `fixed inset-0`, which positions them relative to the **browser viewport** instead of the device viewer frame. In demo/tablet mode, they break out of the rounded iPad container and cover the entire screen.

Affected files:
- `src/components/dock/mixing/DockNewBowlSheet.tsx` (line 30)
- `src/components/dock/mixing/DockProductPicker.tsx` (line 81)
- `src/components/dock/mixing/DockSessionCompleteSheet.tsx` (line 49)

### Fix

Change `fixed inset-0` → `absolute inset-0` in all three files. The parent container in `DockLayout` (line 84) already has `relative` + `overflow-hidden`, so absolute positioning will correctly contain these overlays within the device frame.

**`DockNewBowlSheet.tsx`** — line 30
- `fixed inset-0 z-40` → `absolute inset-0 z-40`

**`DockProductPicker.tsx`** — line 81
- `fixed inset-0 z-50` → `absolute inset-0 z-50`

**`DockSessionCompleteSheet.tsx`** — line 49
- `fixed inset-0 z-50` → `absolute inset-0 z-50`

Three single-line changes. No structural or design changes needed — the sheets already render correctly once contained.

