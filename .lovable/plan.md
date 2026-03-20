

## Remove Faux Fallback for Org-Specific Demo Mode

### Problem
When viewing a real organization (Drop Dead Salons) in demo mode, if a team member (e.g., Eric D.) has no appointments today, the code falls back to faux `DEMO_APPOINTMENTS` data. This is misleading — it shows fake "Jenna B." appointments for a real org's stylist.

### Change

**`src/hooks/dock/useDockAppointments.ts`** — Line 165

Remove the faux data fallback for the org-specific demo path. Only use `DEMO_APPOINTMENTS` for the generic preview mode (which already has its own branch on line 39).

```
// Before:
return appointments.length > 0 ? appointments : DEMO_APPOINTMENTS;

// After:
return appointments;
```

This is a one-line change. The generic preview path (`isDemoMode && !usesRealData`) on line 39 still returns faux data as expected.

