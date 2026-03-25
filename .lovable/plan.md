

## Fix: Pre-select Current Services + Standardize Sheet Top Padding

### Problem 1 — Current services not visible
The Edit Services sheet initializes selected services from `currentServices` (an array of names), but the selected chips section only shows after initialization. The real issue from the screenshot: the services ARE being matched, but nothing is pre-checked because `currentServices` passed from the parent might be empty or mismatched. The chips do render when services are selected — the initialization logic at lines 46-57 looks correct, so the issue is likely that `currentServices` is passed as an empty array from the parent.

### Problem 2 — Insufficient top padding on drawers
Several sheets use `pt-2` instead of the standard `pt-5`/`pt-6` used by other Dock sheets. This makes the header feel cramped against the top edge.

### Fix

**1. `src/components/dock/appointment/DockEditServicesSheet.tsx`**
- Change header padding from `pt-2 pb-4` → `pt-6 pb-4` (matches DockAppointmentDetail, DockNewBowlSheet)
- Add a "Current Services" label above the selected chips section to make it clear these are the existing appointment services
- Style the section distinctly — e.g., a subtle card background with "On this appointment" label

**2. `src/components/dock/mixing/DockProductPicker.tsx`**
- Change header padding from `pt-2 pb-3` → `pt-5 pb-3` (matches DockSessionCompleteSheet)

**3. `src/components/dock/appointment/DockAppointmentDetail.tsx`**
- Verify `currentServices` is correctly populated from the effective service name (including sessionStorage overrides for demo mode) and passed as a proper array to `DockEditServicesSheet`

### Summary — 3 files, padding consistency + prominent current-service display

