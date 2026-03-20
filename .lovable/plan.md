

## Show PIN Gate Inside Device Viewer Frame

### Problem

The `DockPinGate` renders as a raw full-screen overlay (line 87-88 in `Dock.tsx`) without any `DockDemoProvider` or device frame wrapper. In the demo/preview context, this breaks the immersive feel — the PIN screen should appear inside the tablet/phone frame like everything else.

### Change

**`src/pages/Dock.tsx`**

1. **Wrap the PIN gate in the device viewer** when in a demo-capable context. Instead of returning bare `<DockPinGate>`, wrap it in a minimal device frame using the same `DockDemoProvider` + device-constrained container that `DockLayout` uses.

2. **Create a lightweight `DockPinGateFrame` wrapper** inline in `Dock.tsx` (or extract to a small component) that:
   - Reads `device` and `orientation` from `useDockDevicePreview()`
   - Renders the dotted-grid background + rounded device border (same as `DockLayout`'s constrained mode)
   - Places `DockPinGate` inside the frame
   - Only applies the frame when `canAccessDemo` is true (i.e. dev/preview contexts); real production PIN gate stays full-screen

3. **No changes to `DockPinGate` itself** — it already uses `fixed inset-0` styling which will fill whatever container it's in. We just need to change the container from the browser viewport to the device frame.

### Technical detail

- Reuse `DEVICE_DIMENSIONS` and the same frame styling from `DockLayout` (rounded corners, border, shadow, dotted background)
- Use `useDockDevicePreview()` directly (no need for `DockDemoContext` since there's no staff yet)
- The `DockDeviceSwitcher` should also render above the frame so demo users can change device size even on the PIN screen
- When `canAccessDemo` is false (production), render `<DockPinGate>` directly as before — no frame

