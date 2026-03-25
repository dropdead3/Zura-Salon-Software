

## Fix Quick Setup Dialog: Wider + Fully In-View

### Problem
The dialog is `max-w-md` (28rem / 448px) which clips the "Standard" / "Chemical" buttons. The service list uses `max-h-[40vh]` inside a `max-h-[85vh]` container, wasting vertical space.

### Changes — `ServiceTrackingQuickSetup.tsx`

**1. Widen the dialog** (line 264)
- Change `max-w-md` → `max-w-2xl` (672px) so buttons and service names fit without clipping.

**2. Use flex layout for proper height distribution** (line 264)
- Add `flex flex-col` to DialogContent and change `overflow-y-auto` to only apply to the scrollable content area, not the whole dialog. This keeps header, step tabs, progress bar, and footer always visible.

**3. Expand the service list scroll area** (line 146)
- Change `max-h-[40vh]` → `flex-1 overflow-y-auto min-h-0` so the list fills all available space between the header/progress and footer.

**4. Restructure DialogContent layout**
- Header + step tabs + progress: fixed (no scroll)
- Step content: flex-1 with overflow scroll
- Footer nav: fixed at bottom (no scroll)

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx`

