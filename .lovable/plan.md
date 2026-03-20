

## Plan: Fix Booking Sheet Not Appearing

### Root Cause
The `DockNewBookingSheet` uses `createPortal(…, document.body)` to render the overlay. When the Dock is in **device preview mode** (phone/tablet), the content sits inside a container with `overflow: hidden` and `border-radius: 2rem`. The portal escapes this container and renders at the `document.body` level — but the page's background and z-index stacking means it either renders invisibly behind the device frame, or is clipped/unreachable.

Even in "full" mode, the fixed-inset parent might conflict with the portal z-index.

### Fix
Remove the `createPortal` wrapper entirely. Render the sheet **inline** within the component tree instead of portaling to `document.body`. Since the Dock already has a `fixed inset-0` parent, the sheet's `fixed inset-x-0 bottom-0` positioning will work correctly within the Dock context. For the constrained device preview, switch from `fixed` to `absolute` positioning so the sheet stays within the device frame.

### Changes

**`src/components/dock/schedule/DockNewBookingSheet.tsx`**
- Remove `createPortal` import and usage — return the `AnimatePresence` JSX directly
- Change the backdrop and sheet from `fixed` to `absolute` positioning so they respect the device preview container
- Ensure the parent in `DockScheduleTab` has `relative` positioning to anchor the absolute overlay

**`src/components/dock/schedule/DockScheduleTab.tsx`**
- Add `relative` class to the root `<div>` so the absolutely-positioned sheet anchors correctly

