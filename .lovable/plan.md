

## Remove "Map Components" Step from Quick Setup Wizard

### Rationale
Product-to-service mapping happens automatically during the mixing/dispensing workflow when stylists weigh ingredients on the scale. A manual "Map Components" step in the wizard is redundant and confusing for users who have no context for it.

### Changes

**1. Remove the "Map Components" step from STEPS array**
In `ServiceTrackingQuickSetup.tsx`, delete the `components` step entry from the `STEPS` array (line 44) and remove the entire `case 'components'` block (lines 263–299).

**2. Remove unused imports and props**
- Remove `useServiceTrackingComponents`, `useDeleteTrackingComponent`, `useUpsertTrackingComponent` imports
- Remove `componentsByService` from the Props interface and destructuring
- Remove the `WizardComponentRow` sub-component entirely
- Remove the `backroomProducts` query and `upsertComponent` mutation used only by that step
- Remove `trackedServices` and `trackedNoComponents` derived state
- Clean up unused icon imports (e.g. `Package` if no longer used, `X`)

**3. Remove "Components" progress milestone from parent**
In `ServiceTrackingSection.tsx`, remove the "Components" milestone from the `milestones` array (lines 254–259). Remove `componentsByService` from the `ServiceTrackingQuickSetup` props passed on line 920. Remove `componentsByService` from the Props interface in the wizard.

**4. Clean up "Components" references in the main table**
In `ServiceTrackingSection.tsx`, remove the component count display in the drill-down rows (lines 671–674) and the `needsAttention` check for missing components (line 229). Remove the `componentsByService` map computation if it's no longer used elsewhere, or keep it if the drill-down still references it for informational purposes.

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx`
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

