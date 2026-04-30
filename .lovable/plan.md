## Goal

When the user is in `desktop`/`tablet`/`mobile` view and clicks the **Fit to pane** button, it switches to `fit` (current behavior). Clicking it a second time should now **revert to the previous device view** instead of doing nothing.

## Behavior

- Track the last non-`fit` device the user was on (default: `desktop`).
- Click on Fit button:
  - If `device !== 'fit'` → remember current device as `previousDevice`, switch to `fit`.
  - If `device === 'fit'` → switch back to `previousDevice`.
- Tooltip updates dynamically:
  - In any device mode: `"Fit to pane"`
  - In fit mode: `"Back to {previousDevice} view"`
- Visual affordance when in fit mode: swap the `Maximize2` icon for `Minimize2` so the user sees it as a toggle (matches the screenshot intent — user wants a clear "revert" affordance).

## Implementation

**File:** `src/components/dashboard/website-editor/LivePreviewPanel.tsx`

1. Add a `useRef<Exclude<DeviceMode, 'fit'>>('desktop')` to remember the last device. Initialize from current `device` if it's not `'fit'` on mount.
2. Add a `handleFitToggle()` handler:
   ```tsx
   const previousDeviceRef = useRef<Exclude<DeviceMode, 'fit'>>(
     device !== 'fit' ? device : 'desktop'
   );

   // Keep ref in sync whenever user picks a real device
   useEffect(() => {
     if (device !== 'fit') previousDeviceRef.current = device;
   }, [device]);

   const handleFitToggle = () => {
     setDevice(device === 'fit' ? previousDeviceRef.current : 'fit');
   };
   ```
3. Replace the Fit `DeviceButton` (line 307–309) to use `handleFitToggle`, dynamic title, and conditional icon (`Minimize2` when `device === 'fit'`, otherwise `Maximize2`).
4. Import `Minimize2` from `lucide-react`.

## Out of scope

- No persistence of `previousDevice` across reloads (lives in component memory). The persisted `setDevice` already remembers the last active mode for next session.
- No changes to other device buttons or orientation/refresh controls.
