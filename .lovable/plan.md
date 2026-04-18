

## Fix spacing below Personal Context card in Appointment drawer

### Diagnosis from screenshot
The dashed "Add personal context" card sits too close to the "APPOINTMENT" section below it. Top gap (tabs → card) looks ~16px; bottom gap (card → APPOINTMENT label) looks ~8px. Asymmetry needs to resolve to equal spacing on both sides.

### Investigation needed
Open `src/components/dashboard/appointment-drawer/AppointmentDetailSheet.tsx` (or sibling Details tab component) to confirm:
- The wrapper around `<HospitalityBlock>` and the sibling `APPOINTMENT` section.
- Whether the parent uses `space-y-*` (and if so, what value) vs. ad-hoc margins on the APPOINTMENT block.
- Confirm last edit removed `mt-3` from `HospitalityBlock` — likely the APPOINTMENT section itself has no top margin, and parent gap is too tight.

### Likely fix
One of:
- **A.** Parent container uses `space-y-3` (12px) — bump to `space-y-4` (16px) to match the top gap from `TabsContent pt-4`.
- **B.** APPOINTMENT section has `mt-2` or no margin — add `mt-4` (or rely on parent `space-y-4`) so it sits 16px below the personal context card.

Preferred: **option A** (parent-managed gap) — honors the canon rule "vertical gaps managed exclusively by parent containers" and keeps siblings consistent without per-section margins.

### Out of scope
- No changes to the personal context card itself, the tabs, or the APPOINTMENT section internals.
- No changes to other tabs (History, Photos, Notes, Color Bar).

### Verification
Reload the appointment drawer Details tab and visually confirm the gap above the personal context card equals the gap below it (both ~16px to APPOINTMENT label).

