
Fix demo-mode appointment population in two places so faux appointments truly always appear.

1. Wire the selected demo location through the actual staff session
- File: `src/pages/Dock.tsx`
- Problem: `demoLocationId` is updated, but `effectiveStaff` still points to `staff` directly, so the chosen location may never reach `DockLayout` / `useDockAppointments`.
- Change: derive `effectiveStaff` so demo mode uses `demoLocationId || staff.locationId`, ensuring location changes in the device switcher actually flow into the schedule query.

2. Make the appointments hook fall back to faux data on every “empty demo” path
- File: `src/hooks/dock/useDockAppointments.ts`
- Problem: the current fallback only runs at the final return. Earlier exits still return `[]`, which produces the empty-state screen.
- Update the org-specific demo branch so these cases return `DEMO_APPOINTMENTS` instead of `[]`:
  - no `locationId` selected yet
  - “All Team” mode with zero assigned team profiles for that location
  - any successful real-data fetch that resolves to zero appointments
- Keep real appointments when available; only use faux data when the demo would otherwise be empty.

3. Preserve current real-data behavior without blocking the demo
- Keep org-scoped queries for services/clients/team members intact.
- Only change the schedule behavior so demo mode is resilient even when staff/location assignments are incomplete.

4. Expected result
- Entering demo mode always shows appointments.
- If the selected org/location has real appointments today, those still appear.
- If location wiring is delayed, unassigned, or returns no matches, the static demo schedule appears instead of “No appointments today.”

Technical notes
- Root cause is not just the final fallback line; it’s the earlier `return []` branches in `useDockAppointments`.
- The screenshot and current code strongly suggest the active path is one of those early exits, especially with the North Mesa location and limited assigned team profile data.
- This is a frontend-only fix; no backend changes needed.
