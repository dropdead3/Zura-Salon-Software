

## Bowl Detection Gate — Gaps and Enhancements

After reviewing the full mixing flow (empty state → bowl creation → live dispensing → session complete), here are the considerations beyond the core detection gate:

### 1. Subsequent Bowls Need the Gate Too

The "Add Bowl" button (line 266) also calls `setShowNewBowl(true)`. The detection gate should trigger for **every** new bowl, not just the first. The gate validates that a fresh, empty, tared container is on the scale each time.

### 2. Reconnection / Scale Disconnect Mid-Session

If the scale disconnects while mixing (future BLE), there's no reconnection flow. The gate component should be reusable as a **reconnect overlay** that can appear mid-dispensing. For Phase 1 (manual adapter), this isn't blocking, but the component API should accept a `mode: 'initial' | 'reconnect'` prop so the UI can say "Scale disconnected — place bowl back on scale" vs the first-time flow.

### 3. Tare Confirmation Before Each Ingredient

The reference image shows taring at bowl placement. But in real salon workflows, bowls aren't always re-tared between ingredients — the scale just tracks cumulative weight. The gate should tare **once per bowl** (at creation), not per ingredient. The current `DockLiveDispensing` doesn't have a tare step, which is correct — just making sure the gate doesn't imply repeated taring.

### 4. Demo Mode Auto-Progression Timing

In demo mode the gate auto-advances. But if a user rapidly taps "Start Mixing" and then taps "Skip", the gate and the bowl sheet could race. Need a simple guard: `if (showBowlDetection) return` before opening the sheet, and clear detection state before opening the sheet.

### 5. Back Navigation from Detection Gate

If the user is in the detection gate and hits the appointment-level back button (top-left arrow), the gate should close cleanly. Currently `onBack` in the parent sets `view = 'tabs'` — need to also reset `showBowlDetection = false`.

### 6. No Change Needed for Session Complete

The `DockSessionCompleteSheet` runs after all bowls are sealed/reweighed. The detection gate is only relevant at bowl creation time — session completion is unaffected.

---

### Updated Plan (incorporating the above)

**New file: `src/components/dock/mixing/DockBowlDetectionGate.tsx`**
- Three phases: connecting (1.5s) → place bowl (waiting) → taring (1s) → `onReady()`
- Props: `open`, `onReady()`, `onCancel()`, `isDemoMode`, `mode: 'initial' | 'reconnect'`
- "Skip — Manual Entry" link at bottom
- Uses `absolute inset-0 z-35` (below sheet z-40)
- Framer-motion phase transitions with platform spring config

**Modified: `src/components/dock/appointment/DockServicesTab.tsx`**
- New state: `showBowlDetection: boolean`
- Both the empty-state tap **and** the "Add Bowl" button set `showBowlDetection = true`
- `onReady` → close gate, open `DockNewBowlSheet`
- `onCancel` → close gate, stay on current view
- Guard against race conditions (clear detection before opening sheet)
- Reset `showBowlDetection` when parent triggers `onBack`

No schema changes. 2 files total (1 new, 1 modified).

