

## Add breathing room above APPOINTMENT section in Appointment Drawer

### Diagnosis
In `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`, the Details tab structure is:
- `<HospitalityBlock />` (line 1647)
- `<ClientMemoryPanel className="-mx-4 mt-4 mb-4 ..." />` (line 1654) — frequently renders nothing when no client memory exists
- `<motion.div className="space-y-5">` (line 1660) — contains the "APPOINTMENT" subsection at line 1700–1701

When `ClientMemoryPanel` returns null (the common case shown in the screenshot), there is **no top margin** on the `motion.div` wrapper, so "APPOINTMENT" collides visually with the hospitality cards above it.

### Fix
Add `mt-5` to the `motion.div` at line 1660 so the APPOINTMENT block has consistent breathing room (20px) regardless of whether `ClientMemoryPanel` renders.

```tsx
<motion.div variants={staggerContainer} initial={false} animate="show" className="mt-5 space-y-5">
```

This is safe because:
- When `ClientMemoryPanel` renders, its own `mb-4` + new `mt-5` compose to ~36px (acceptable section break).
- When `ClientMemoryPanel` is null, the new `mt-5` provides the missing gap.

### Out of scope
- No changes to `HospitalityBlock`, `ClientMemoryPanel`, or the APPOINTMENT section internals.
- No changes to other tabs (History, Photos, Notes, Color Bar).

### Verification
Open an appointment for a client with no client memory → confirm "APPOINTMENT" label sits ~20px below the Hospitality cards (no longer crowded). Open an appointment for a client *with* client memory → confirm spacing still feels intentional.

