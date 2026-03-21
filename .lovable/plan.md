

## Always Populate Faux Appointments in Demo Mode

**Problem:** When entering demo mode with a real org ID (`?demo=<orgId>`), the hook queries real DB data. If no appointments exist for that org today, the schedule shows "No appointments today" — defeating the purpose of a demo.

**Fix in `src/hooks/dock/useDockAppointments.ts`:**

In the `isDemoMode && usesRealData` branch (around line 42-183), after fetching real appointments, if the result is empty, fall back to returning `DEMO_APPOINTMENTS`. This ensures demo mode always has content to showcase.

Change: After line 182 (`return appointments;`), replace with:
```typescript
return appointments.length > 0 ? appointments : DEMO_APPOINTMENTS;
```

This single-line change means:
- If the org has real appointments today → show them (more realistic demo)
- If no real appointments → always fall back to the faux data so the demo is never empty

