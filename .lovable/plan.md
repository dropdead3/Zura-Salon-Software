

## Move App Preferences to Org-Wide Backroom Settings & Wire Dock Enforcement

### Current State
- **Assistant Prep**, **Smart Mix Assist**, and **Formula Memory** exist as per-service boolean columns on the `services` table
- They are only toggled in `ServiceTrackingSection.tsx` — the Dock never reads them
- Smart Mix Assist already has a separate org-wide `smart_mix_assist_settings` table (used by `FormulaAssistanceSection`)
- Formula Memory is used unconditionally in `DockClientTab` (no gating)
- Assistant Prep is not consumed anywhere in the Dock

### What Changes

**1. Store as org-wide backroom_settings keys** (no migration needed)

Use the existing `backroom_settings` table with three new setting keys:
- `dock_assistant_prep_enabled` → `{ enabled: boolean }`
- `dock_smart_mix_assist_enabled` → reads from existing `smart_mix_assist_settings.is_enabled` (already org-wide — no duplication)
- `dock_formula_memory_enabled` → `{ enabled: boolean }`

Since Smart Mix Assist already has its own dedicated settings table and `FormulaAssistanceSection` UI, we only need to add **two** new `backroom_settings` keys (assistant prep + formula memory). Smart Mix Assist continues using its existing table.

**2. Remove per-service App Preferences section from ServiceTrackingSection**

- Delete the entire "Section 3: App Preferences" block (~lines 955–983)
- Remove `assistant_prep_allowed`, `smart_mix_assist_enabled`, `formula_memory_enabled` from the select query and `ServiceRow` interface
- Remove these fields from all "Reset Configuration" mutation payloads (4 places)
- Remove `activeToggles` count that references these fields

**3. Add org-wide toggles to FormulaAssistanceSection**

Extend the existing `FormulaAssistanceSection` (Backroom Hub → Formula Assistance) with two additional cards:
- **Formula Memory** card with enable/disable switch + description
- **Assistant Prep** card with enable/disable switch + description

These sit alongside the existing Smart Mix Assist card, making `FormulaAssistanceSection` the single source of truth for all three Dock intelligence features.

**4. Create `useDockFeatureSettings` hook**

A lightweight hook that resolves all three org-wide feature flags for Dock consumption:
```ts
export function useDockFeatureSettings(orgId?: string) {
  // Reads backroom_settings for assistant_prep + formula_memory
  // Reads smart_mix_assist_settings for smart mix
  // Returns { assistantPrepEnabled, smartMixAssistEnabled, formulaMemoryEnabled, isLoading }
}
```

**5. Wire enforcement in Dock**

- **Formula Memory**: Gate the `useInstantFormulaMemory` call in `DockClientTab.tsx` — only fetch/render the "Last Formula" section when `formulaMemoryEnabled` is true
- **Smart Mix Assist**: Already gated via `isSmartMixAssistEnabled()` in the service layer — no Dock changes needed
- **Assistant Prep**: No Dock surfaces exist yet for this feature — the toggle becomes a forward-looking configuration. No enforcement wiring needed until the prep workflow is built.

### Files Modified
1. `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` — Remove App Preferences section + related fields
2. `src/components/dashboard/backroom-settings/FormulaAssistanceSection.tsx` — Add Formula Memory + Assistant Prep cards
3. `src/hooks/backroom/useDockFeatureSettings.ts` — New hook for Dock feature flag resolution
4. `src/components/dock/appointment/DockClientTab.tsx` — Gate formula memory behind org setting

### Scope
- No database migrations (uses existing `backroom_settings` table)
- Per-service columns remain in the DB but are no longer referenced in code
- No breaking changes

