

## Plan: Device Preview Switcher for Dock App

### What
Add a floating device-toggle toolbar to the Dock app that lets you switch between **Phone**, **Tablet**, and **Full** (native) layouts. This is a dev/demo tool — only visible in demo mode.

### How

#### 1. Create `src/components/dock/DockDeviceSwitcher.tsx`
A small floating pill (top-right corner) with three toggle buttons: Phone · Tablet · Full.
- Phone: constrains the Dock to a `390×844` centered container with a device frame border
- Tablet: constrains to `820×1180` centered container
- Full: no constraint (current behavior, fills the viewport)
- Persists choice to `localStorage('dock-device-preview')`

#### 2. Create `src/hooks/dock/useDockDevicePreview.ts`
Simple state hook returning `{ device, setDevice }` where device is `'phone' | 'tablet' | 'full'`. Reads initial value from localStorage.

#### 3. Update `DockDemoContext.tsx`
Add `device` and `setDevice` to the context so it's accessible everywhere. Only exposed when `isDemoMode` is true.

#### 4. Update `DockLayout.tsx`
- When device is `'phone'` or `'tablet'`, wrap the entire layout in a centered container with the fixed dimensions, rounded corners, and a subtle border to simulate the device frame
- The outer wrapper fills the viewport with a dark grid background so the "device" floats visually
- When `'full'`, keep current behavior (no wrapper)

#### 5. Provide `dockDevice` CSS class context
Add a `data-dock-device="phone|tablet|full"` attribute to the layout root so child components can conditionally adjust layout via CSS or reading the context (e.g., tablet mode could show a 2-column schedule grid in the future).

### Device dimensions
- Phone: `390 × 844` (iPhone 14 Pro)
- Tablet: `820 × 1180` (iPad Air portrait)
- Full: viewport

### Visibility
- Only rendered when `isDemoMode === true`
- The switcher pill sits in `position: fixed; top: 12px; right: 12px; z-index: 50`

