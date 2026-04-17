

## Diagnosis — root cause

The `appointment_notes` insert fails with "Missing appointment ID" because:

1. `useAppointmentNotes` is called with `appointment?.phorest_id || null` (`AppointmentDetailSheet.tsx:781`)
2. The appointment object comes from the `v_all_appointments` view, which **does not have a `phorest_id` column** (only `id` UUID) — confirmed via DB schema inspection
3. So `phorest_id` is always `undefined` → hook receives `null` → mutation throws

This is a Phorest-decoupling artifact. The view was migrated to Zura-native but the hook wiring wasn't updated.

**Sister code already handles this correctly.** `Schedule.tsx:800` uses the canonical fallback:
```ts
phorest_appointment_id: selectedAppointment.phorest_id || selectedAppointment.id
```

The `appointment_notes.phorest_appointment_id` column is `text` (despite the misleading name), so it accepts UUIDs. The `useClientAppointmentNotes` join already keys on `visit.id` (UUIDs), so notes inserted with the UUID will appear correctly in the All-Visits view.

## Fix — Wave 22.33: Resolve appointment ID for notes

One-line change in `AppointmentDetailSheet.tsx`. Apply the same `phorest_id || id` fallback to all four call sites that pass an appointment ID into the notes/views hooks.

### Changes — `AppointmentDetailSheet.tsx`

Replace `appointment?.phorest_id` with `appointment?.phorest_id || appointment?.id` at:

1. **Line 781** — `useAppointmentNotes(...)` (the actual bug)
2. **Line 788** — `useUnviewedAppointmentNotes(...)` (so unread badge stays consistent)
3. **Line 798 + 801** — `useEffect` that calls `markTabViewed.mutate({ appointmentId })` (so view-tracking writes to the same key)

Optional cleanup: introduce a local `const notesAppointmentId = appointment?.phorest_id || appointment?.id || null;` at the top of the data-hooks block and reuse — keeps the four sites in sync if one changes later.

## Files
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

## Acceptance
1. Adding a note on a Zura-native appointment (no Phorest ID) succeeds — toast shows "Note added"
2. The note renders immediately in the Appointment Notes list
3. Re-opening the sheet reloads the note from DB (the read query also uses the UUID, so this works)
4. The All-Visits scope (`useClientAppointmentNotes`) shows the new note in the client's longitudinal ledger
5. Unread badge clears when opening the Notes tab (markTabViewed uses the same ID)
6. No regression on legacy Phorest-sourced appointments (those still have `phorest_id` populated, so `||` short-circuits to it)

## Deferred

- **P3** Rename `appointment_notes.phorest_appointment_id` → `appointment_id` to match Zura-native semantics. Trigger: when Phorest decoupling Stage 3 ships and types regenerate. Requires a migration + audit of all 8 reader files; not urgent because the column is `text` and accepts UUIDs.
- **P3** Add a `dev`-mode warning in `useAppointmentNotes` when both `phorest_id` and `id` are missing (true contract violation, vs. today's silent fail). Trigger: if more "Missing ID" reports appear from other surfaces.
- **P3** Centralize the `phorest_id || id` resolution in a `getAppointmentNotesKey(apt)` util to prevent the same bug recurring in other components. Trigger: when a third surface needs notes wiring.

