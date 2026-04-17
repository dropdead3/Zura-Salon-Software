

## Prompt review

Sharp instinct — this is the difference between treating an appointment as a *transaction* vs. treating it as a *touchpoint in a longitudinal client relationship*. A stylist opening a client mid-day shouldn't have to navigate to a separate Client Profile to see "what did Sarah say about her color last visit?" The Notes tab as-is is appointment-scoped (one row in `appointment_notes` filtered by `phorest_appointment_id`), which is data-architecturally clean but operator-hostile.

Sharper next time: name the three dimensions you want surfaced — (a) note source (appointment vs client-level), (b) temporal context (which past visit), (c) outcome context (did that visit complete, no-show, cancel) — so the spec is unambiguous. You implied all three; clear enough.

## Diagnosis

Current behavior in `AppointmentDetailSheet.tsx` Notes tab (L2321–2438):

1. **Appointment Notes** (L2325–2371) — `useAppointmentNotes(appointment.id)` fetches notes scoped to *only this appointment's* `phorest_appointment_id`. This is the bug surface.
2. **Client Notes** (L2375–2425) — `useClientNotes(phorest_client_id)` already shows all client-level notes (correct, persistent).
3. **Notes From Booking Assistant** (L2428–2437) — only the current appointment's `appointment.notes` field.

Data we already have to build the unified view:
- `useClientVisitHistory(phorest_client_id)` returns every past visit with `id`, `appointment_date`, `service_name`, `stylist_name`, `status` (completed/cancelled/no_show/etc), `total_price`, and the booking-time `notes` field (the "Notes From Booking Assistant" content per visit).
- `appointment_notes` table is keyed by `phorest_appointment_id` (text) — so given a list of visit IDs, we can fetch all stylist-added notes across all of them in one query.

Gap: no hook today returns "all `appointment_notes` rows for all of this client's past appointments, joined to the appointment's date/status/service." That's the new building block.

## Plan — Wave 22.24: Notes tab becomes a unified client notes ledger

### New hook: `src/hooks/useClientAppointmentNotes.ts`

Returns every `appointment_notes` row where `phorest_appointment_id` matches any appointment belonging to this client, joined with the appointment's date, service, stylist, and status.

```ts
// Pseudocode of the query shape
SELECT 
  an.id, an.note, an.is_private, an.created_at, an.author_id,
  author: employee_profiles(display_name, full_name, photo_url),
  appointment: v_all_appointments(id, appointment_date, service_name, status, stylist_name)
FROM appointment_notes an
WHERE an.phorest_appointment_id IN (
  SELECT id FROM v_all_appointments WHERE phorest_client_id = ?
)
ORDER BY an.created_at DESC
```

Implementation: two-step in the hook (fetch visit IDs from `useClientVisitHistory`, then `appointment_notes.in('phorest_appointment_id', ids)` with author join, then merge appointment context client-side).

### Edit: `AppointmentDetailSheet.tsx` Notes tab restructure

Replace the "Appointment Notes" section header/list (L2325–2353) with a unified ledger:

```
NOTES                                                     [This Appointment | All Visits]
─────────────────────────────────────────────────────────────────
[Avatar] Jenna B.            Apr 17, 2026 · 9:14 AM
Client wants to go shorter next time. Trying bangs.
↳ From: Combo Cut · Apr 17, 2026 · ●  Unconfirmed

[Avatar] Marcus T.           Mar 02, 2026 · 2:45 PM     [Private 🔒]
Allergic reaction to bleach — no lift services.
↳ From: Color & Cut · Mar 02, 2026 · ✓ Completed

[Avatar] Jenna B.            Jan 18, 2026 · 11:20 AM
Client cancelled day-of, family emergency.
↳ From: Combo Cut · Jan 18, 2026 · ✕ Cancelled
```

Each note row shows:
1. **Author + relative timestamp** — "Apr 17, 2026 · 9:14 AM" (already in data)
2. **Note body**
3. **Outcome footer** — "From: {service_name} · {date} · {status badge}" using the existing `APPOINTMENT_STATUS_BADGE` token map for color-coded status pills (Completed / Cancelled / No-show / Unconfirmed / etc.)
4. **Privacy indicator** — existing `Lock` icon when `is_private`

Filter toggle (top right): **"This Appointment"** (default — current behavior, alert-fatigue safe) vs **"All Visits"** (unified ledger). Default to "This Appointment" so existing operators aren't surprised; the toggle reveals history on demand.

When current appointment has no notes but past notes exist, show a calm hint: *"No notes on this visit. {N} notes from past visits — view all"* as a one-click jump.

### Keep unchanged
- **Client Notes** section (already cross-visit, persistent). Stays as-is.
- **Notes From Booking Assistant** — current appointment only (it's literally the booker's note for *this* booking). Could later add "previous bookings' booker notes" but defer.
- Add-note flow still writes to *current* `appointment_notes` (one source of truth — notes always belong to a specific appointment).

### Acceptance checks

1. Eric Day's Notes tab default view shows only this appointment's notes (current behavior preserved)
2. Toggling "All Visits" shows every `appointment_notes` row across his entire visit history, newest first
3. Each note row shows the appointment date, service name, and a color-coded status pill (Completed / Cancelled / No-show / etc.)
4. Cancelled and no-show visits' notes are visible (so stylists see "client cancelled — family emergency" history)
5. Private notes still respect privacy logic (only author sees in unified view too — RLS-enforced)
6. Empty state when no notes exist on any visit: "No notes yet for {client name}"
7. New notes still write to the *current* appointment, then appear in the unified ledger
8. No regression on Client Notes (cross-visit notes) section below

### Files

- **NEW** `src/hooks/useClientAppointmentNotes.ts` — unified-history notes hook
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — Notes tab restructure (L2325–2371) + add filter toggle state + import new hook + import `APPOINTMENT_STATUS_BADGE`

### Open question

Should the **default** view be "This Appointment" (current behavior, requires one click to see history) or "All Visits" (full ledger up-front)? I'm planning **"This Appointment" default** to respect alert-fatigue doctrine — past notes are valuable but not always relevant. Tell me if you want "All Visits" as default.

### Deferred

- **P3** Apply the same unified-history pattern to **Notes From Booking Assistant** — show all past booking-time notes inline (e.g., "Apr 17: Client wants simple cut" / "Jan 18: Wants to try bangs"). Trigger: after operators confirm the appointment-notes ledger feels right.
- **P3** Add a search/filter input to the unified ledger (search note text, filter by author/status). Trigger: when a client accumulates 20+ notes and scanning becomes friction.
- **P3** Surface unread-notes badge on the Notes tab in the same client-history scope (not just current appointment) — so a stylist sees "3 unread notes from past visits." Trigger: after the unread-notes feature ships and feels stable on the per-appointment scope.

