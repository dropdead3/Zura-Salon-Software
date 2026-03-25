

## Toggle Formula History Sheet on Floating Button

### Problem
The formula history floating button (bottom-left corner) only opens the sheet — tapping it again does nothing because it always calls `setShowFormulaHistory(true)`.

### Change

**`src/components/dock/appointment/DockServicesTab.tsx`** — one-line fix:
- Line 538: Change `onClick={() => setShowFormulaHistory(true)}` to `onClick={() => setShowFormulaHistory(prev => !prev)}` so the button toggles the sheet open/closed.

### Files
- `src/components/dock/appointment/DockServicesTab.tsx` — toggle instead of set-true

