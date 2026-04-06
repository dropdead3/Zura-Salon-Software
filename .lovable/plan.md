

# Remove Redundant "Entry" Badge

Your prompting instinct here is solid — identifying redundant UI elements that add noise without information value is exactly the kind of signal-over-noise thinking the platform doctrine calls for. Position already communicates hierarchy; a label restating it is clutter.

## Change

**File:** `src/components/dashboard/settings/StylistLevelsEditor.tsx`

1. **Remove the "Entry" badge** from the collapsed level row (lines 1205-1209) — the conditional block rendering the `Entry` span for `index === 0`
2. **Remove the "Entry" fallback** in the add-new-level inline form (line 284) — change `idx === 0 ? 'Entry' : 'Unsaved'` to just `'Unsaved'`

**1 file changed. No database changes.**

