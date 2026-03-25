

## Wire Scale Readings into Teardrop Dispensing Flow

### Problem
Currently, the ingredient dispensing view is entirely manual — you tap a weight pill, type on a numpad, and confirm. The scale adapter exists (`ScaleAdapter` / `BLEScaleAdapter`) but is only used in the `DockScaleTab` for connection management. It's not wired into the actual dispensing flow.

The desired UX: when an ingredient is selected, the scale streams real-time weight readings that **automatically fill the teardrop** as product is dispensed into the bowl. The numpad becomes a fallback for manual override.

### New UX Flow
1. User taps ingredient → `DockIngredientDispensing` opens
2. If scale is connected: weight pill shows **live weight** streaming from scale, teardrop fills in real-time
3. If scale is NOT connected (or manual mode): show "Tap to weigh" as today, numpad entry
4. When scale reading stabilizes at/near target: subtle haptic + visual cue (teardrop glow)
5. User taps **Done** to confirm the current reading and auto-advance

### Changes

**1. New hook: `src/hooks/dock/useDockScale.ts`**
- Singleton React context that holds the shared `ScaleAdapter` instance
- Exposes: `liveWeight: number`, `isConnected: boolean`, `connectionState: ConnectionState`, `tare()`, `adapter`
- Subscribes to `adapter.onReading()` and updates `liveWeight` state on each event
- Allows any component in the Dock tree to consume real-time scale data

**2. New provider: `src/components/dock/DockScaleProvider.tsx`**
- Wraps the Dock layout, creates the adapter once (BLE if available, manual fallback)
- Provides the context from `useDockScale`

**3. Modified: `src/components/dock/DockLayout.tsx`**
- Wrap children with `<DockScaleProvider>` so scale state is available everywhere

**4. Modified: `src/components/dock/mixing/DockIngredientDispensing.tsx`**
- Consume `useDockScale()` to get `liveWeight` and `isConnected`
- When `isConnected && !showNumpad`:
  - Replace "Tap to weigh" with live weight display that updates in real-time
  - Teardrop `fillPercent` driven by `liveWeight / targetWeight` instead of static `currentWeight`
  - Weight pill shows streaming value with a subtle pulse animation
  - "Tap to weigh" becomes "Dispensing..." with a scale icon
- Add a **Confirm Weight** button that appears when scale shows a reading > 0; tapping it locks in the current `liveWeight` as the dispensed weight (same as numpad submit)
- When NOT connected: current manual flow unchanged
- "Balance" action button now calls `tare()` on the adapter when connected

**5. Modified: `src/components/dock/mixing/DockLiveDispensing.tsx`**
- When entering ingredient view for a line, call `tare()` to zero the scale for that ingredient
- This way each ingredient starts from 0g on the scale

**6. Modified: `src/components/dock/scale/DockScaleTab.tsx`**
- Use the shared `useDockScale()` context instead of creating its own adapter
- This unifies scale state across the app

### Demo Mode Behavior
- In demo mode with no real BLE: simulate scale readings using a `setInterval` that ramps weight from 0 toward the target over ~5 seconds when the ingredient view opens
- This gives a realistic demo of the teardrop filling automatically

### Files
- `src/hooks/dock/useDockScale.ts` — new (context + hook)
- `src/components/dock/DockScaleProvider.tsx` — new (provider component)
- `src/components/dock/DockLayout.tsx` — wrap with provider
- `src/components/dock/mixing/DockIngredientDispensing.tsx` — live scale integration
- `src/components/dock/mixing/DockLiveDispensing.tsx` — tare on ingredient entry
- `src/components/dock/scale/DockScaleTab.tsx` — use shared context

