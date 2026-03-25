

## Auto-Reweigh from Scale

Replace the manual numpad reweigh input with a live scale-driven reweigh view that automatically captures leftover weight when the bowl is placed on the scale and the reading stabilizes.

### Current behavior
Tapping "Capture Reweigh" opens `DockWeightInput` (a manual numpad). The user types in leftover weight.

### New behavior
Tapping "Capture Reweigh" opens a full-screen reweigh view that:
1. Tares the scale automatically on entry
2. Shows the selected visual aid (teardrop or progress bar) filling as weight is detected
3. Displays live weight reading from the scale
4. Auto-confirms when reading stabilizes (stable flag + weight > 0 for ~1s)
5. Shows a "Confirm" button for manual override if the user wants to lock in early
6. Falls back to manual numpad entry via a "Enter Manually" link if scale is not connected
7. In demo mode, runs the same simulation ramp as dispensing

### Changes

**1. New: `src/components/dock/mixing/DockReweighCapture.tsx`**
- Full-screen view replacing `DockWeightInput` in the reweigh flow
- Uses `useDockScale()` for live weight and stability
- Uses `useDockDispensingVisual()` to show teardrop or progress bar (no target — fill based on weight > 0 with a visual max around ~100g or proportional to dispensed total)
- Tares scale on mount; starts demo simulation in demo mode
- Auto-confirm logic: when `isStable && liveWeight > 0`, start a 1.5s countdown, then call `onSubmit(liveWeight)`
- Cancel countdown if weight changes significantly
- Manual "Confirm" button always available
- "Enter Manually" fallback button opens the existing `DockWeightInput`
- Header: "BOWL X — REWEIGH" with subtitle "Place bowl on scale — weight will capture automatically"

**2. Modified: `src/components/dock/mixing/DockLiveDispensing.tsx`**
- Replace the `reweigh-input` view (lines 189-208) to render `DockReweighCapture` instead of `DockWeightInput`
- Pass `bowlNumber`, `totalDispensed`, `onSubmit={handleReweigh}`, `onCancel`
- Keep manual fallback path inside `DockReweighCapture`

### Files
- `src/components/dock/mixing/DockReweighCapture.tsx` — new
- `src/components/dock/mixing/DockLiveDispensing.tsx` — swap reweigh view

