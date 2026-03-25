

## Rename "Seal Bowl" → "Finish Formulation" + Swap Icons

### Problem
"Seal Bowl" is internal jargon leaking into the UI. The lock icon reinforces a wrong mental model. The action means the stylist finished dispensing — "Finish Formulation" is clearer.

### Changes

**1. `src/components/dock/mixing/DockLiveDispensing.tsx`**
- Line 293: `'Seal Bowl'` → `'Finish Formulation'`, `'Sealing...'` → `'Finishing...'`
- Line 292: `Lock` icon → `Check` icon (already imported)
- Line 234: Status badge icon `Lock` → `Check`
- Line 235: Badge text `'Sealed'` → `'Finalized'`
- Line 191: Copy `'Place sealed bowl on scale...'` → `'Place finished bowl on scale...'`

**2. `src/components/dock/mixing/DockSessionTimeline.tsx`**
- Line 34: `bowl_sealed` label `'Bowl Sealed'` → `'Formulation Finalized'`, icon `Lock` → `Check`

**3. `src/hooks/dock/useDockMixSession.ts`**
- Line 218: Error message `'Failed to seal bowl'` → `'Failed to finish formulation'`
- Line 234: Toast error `'Failed to seal bowl'` → `'Failed to finish formulation'`

### Not changed
Internal variable names (`sealBowl`, `handleSeal`, `isSealed`) and DB state values (`sealed`, `bowl_sealed`) remain as-is — only user-facing copy and icons change.

