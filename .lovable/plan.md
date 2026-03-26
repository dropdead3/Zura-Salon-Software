

## Lift Setup Banner to Backroom Parent Shell

### Problem
The setup wizard banner ("Uh-oh, you haven't finished setting up your backroom!") is rendered inside `BackroomDashboardOverview` — the Overview section's content component. It only appears when the Overview tab is active. It should persist above the page title across all sections until setup is complete.

### Solution
Extract the setup banner into its own component and render it in `BackroomSettings.tsx` above the page header, outside the sidebar/content split. The `useBackroomSetupHealth` hook is already called in `BackroomSettings` so the data is available.

### Changes

**New file: `src/components/dashboard/backroom-settings/BackroomSetupBanner.tsx`**
- Extract lines 99–165 from `BackroomDashboardOverview.tsx` into a standalone `BackroomSetupBanner` component
- Props: `setupHealth`, `onNavigate`, `onResumeSetup`
- Includes the collapsible card with step tracker and warning grid
- Self-manages `setupOpen` collapsible state

**File: `src/pages/dashboard/admin/BackroomSettings.tsx`**
- Import and render `<BackroomSetupBanner>` between the `DashboardLayout` wrapper and the page header (line 228–229)
- Pass `health` data (already available), `handleNavigate`, and a callback to trigger the wizard
- Need to also lift the wizard state (`showWizard`) and `wizardCompleted` check into this component, or pass a simpler `onResumeSetup` that navigates to `overview` and triggers the wizard

**File: `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx`**
- Remove the setup banner block (lines 98–166)
- Remove related imports (`Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`, `ZuraZIcon`, `Check`) if no longer used
- Keep the wizard dialog rendering (lines 84–91) since "Resume Setup" will navigate to overview and trigger it

### Interaction Flow
- "Resume Setup" button: sets `activeSection` to `overview` and triggers the wizard via a callback prop or state
- Step tracker click: calls `onNavigate(section)` to switch to the relevant sidebar section
- Banner disappears globally once `setupHealth.isComplete` is true

### Files

| File | Change |
|------|--------|
| `src/components/dashboard/backroom-settings/BackroomSetupBanner.tsx` | New — extracted banner component |
| `src/pages/dashboard/admin/BackroomSettings.tsx` | Render banner above page header |
| `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx` | Remove banner block |

