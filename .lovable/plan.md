

## Fix: Only Rachel Kim Should Have Allergy Alerts in Demo Mode

### Problem
Both `DockClientAlertsBanner.tsx` and `DockClientTab.tsx` define a single `DEMO_CLIENT_MOCK` with `medical_alerts` and allergy-triggering `notes`. This mock is returned for **every** demo client, so all demo appointments incorrectly show an allergy banner.

### Solution
Make the demo mock client-aware: only return allergy data for Rachel Kim (`demo-client-7` / `demo-pc-7`). All other demo clients get `null` for `medical_alerts` and neutral notes.

### Changes

**1. `src/components/dock/appointment/DockClientAlertsBanner.tsx`**
- Replace the single `DEMO_CLIENT_MOCK` (lines 25-28) with a function that checks the client ID
- If `demo-client-7` or `demo-pc-7` → return mock with `medical_alerts` and sensitivity notes
- All others → return `{ notes: null, medical_alerts: null, name: clientName }`
- Update line 80 to call the function with the current client ID

**2. `src/components/dock/appointment/DockClientTab.tsx`**
- Same approach: replace the single `DEMO_CLIENT_MOCK` (lines 95-105) with a function
- Rachel Kim variant includes allergy data; all others get clean mock with no `medical_alerts` and generic notes (or null)
- Update the query function's demo branch to call with current client/phorest ID

### Technical detail
Both files already have the client IDs available (`phorestClientId`, `clientId`) at the point where the demo mock is used, so no new props or plumbing needed.

### Files changed
- `src/components/dock/appointment/DockClientAlertsBanner.tsx`
- `src/components/dock/appointment/DockClientTab.tsx`

