

## Wave 7 — Phase 4 form-gating enforcement

Three coordinated gates wired against existing `client_form_signatures` + `useUnsignedFormsForClient` infrastructure. No new tables; one new component, one edge function update, one mutation hook addition.

### What ships

**1. Public booking — Hybrid gate (`HostedBookingPage.tsx` + `create-public-booking`)**
- Confirm step shows required forms inline using a new compact variant of `FormSigningDialog` (or render its body inline in a collapsible card).
- Two CTAs: **Sign now & confirm** (signs each form, then submits booking with `forms_completed=true`) or **I'll sign at check-in** (submits booking with `forms_completed=false`, `forms_required=true`).
- Edge function `create-public-booking`:
  - Accepts new optional `signed_form_template_ids: string[]` array.
  - After client upsert, queries `service_form_requirements` for the booked service.
  - If signed list provided, inserts matching rows into `client_form_signatures` (server-side, scoped by org).
  - Writes `forms_required` and `forms_completed` flags to the appointment (new fields — see migration below).

**2. Staff booking — Gate with override (`NewBookingSheet.tsx`)**
- After confirm-step click, if `useUnsignedFormsForClient` returns >0 unsigned required forms, intercept with an AlertDialog: *"Client has N unsigned form(s). Forms can be collected at check-in via Zura Dock — proceed?"*
- Two actions: **Proceed (collect at arrival)** → creates appointment, fires audit event `booking_unsigned_forms_override` to `service_audit_log`. **Sign now** → opens existing `FormSigningDialog`, then proceeds.
- Replaces the current info-only callout copy ("Booking is not gated") with the gated reality.

**3. Kiosk — Hard gate (`Kiosk.tsx` + new `KioskFormSigningScreen.tsx`)**
- Wire the existing TODO at `Kiosk.tsx:36`. New full-screen kiosk-styled component reuses sign-loop logic from `FormSigningDialog` but with tablet-friendly layout (large type, full-screen markdown viewer, large signature input).
- `useKioskCheckin.selectAppointment`: replace `setState('success')` shortcut with: query `useUnsignedFormsForClient` for the selected client + service requirements; if any → `setState('signing')`, else → `setState('success')`.
- On signing complete, advance to `success` and write `forms_completed=true` + `forms_completed_at=now()` to the `appointment_check_ins` row (already has the columns).

### Database changes (one migration)

- Add `forms_required boolean default false`, `forms_completed boolean default false`, `forms_completed_at timestamptz` to `appointments` (mirrors what already exists on `appointment_check_ins` but at the appointment level — needed so the booking flow can record the gate decision before any check-in row exists).
- Backfill: `UPDATE appointments SET forms_required = false WHERE forms_required IS NULL;` (column has default; no real backfill needed).
- New `service_audit_log` event type `booking_unsigned_forms_override` registered in `SERVICE_AUDIT_EVENT_CONFIG` with tone `warning`.

### Deferred items also addressed in this wave

- **Audit log diff for JSON form metadata** — Already partially handled (see `renderValue` line 41–45). Enhance `ServiceAuditLogPanel.renderValue` to also surface `metadata.signing_frequency` and `metadata.is_required` deltas when present on `form_requirement_changed` events. ~10 lines.
- **`useServiceFormRequirements` (table) vs `useRequiredFormsForService` (single)** — Confirmed naming is fine after re-read: one is org-wide list, the other is per-service required-only filter. **No-op.** Add a JSDoc to each clarifying scope so future contributors don't conflate them.

### Out of scope

- Magic-link "sign before arrival" emails — separate comms wave; gate is sufficient for now.
- Re-signing on form template version bumps — `useUnsignedFormsForClient:130-136` already has the hook; UI surfacing is a Wave 8 concern.
- Per-location override of the staff-booking gate (always-skip vs always-prompt) — defer until an operator asks.

### Files touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Add `forms_required/completed/_at` to `appointments` |
| `supabase/functions/create-public-booking/index.ts` | Accept `signed_form_template_ids`, write signatures + flags |
| `src/components/booking-surface/HostedBookingPage.tsx` | Inline form sign-now / defer UI on confirm step |
| `src/components/dashboard/schedule/NewBookingSheet.tsx` | Override AlertDialog + audit-log write; updated copy |
| `src/hooks/useKioskCheckin.ts` | Branch to `signing` state when unsigned forms exist; write completion to check-in row |
| `src/pages/Kiosk.tsx` | Mount `KioskFormSigningScreen` for `signing` state |
| `src/components/kiosk/KioskFormSigningScreen.tsx` | **New** — tablet-styled sign loop |
| `src/hooks/useServiceAuditLog.ts` | Register `booking_unsigned_forms_override`, tone `warning` |
| `src/components/dashboard/settings/ServiceAuditLogPanel.tsx` | Surface form_requirement metadata diffs |
| `src/hooks/useServiceFormRequirements.ts` & `useRequiredFormsForService.ts` | JSDoc clarifications |

### Verification after apply

1. Public booking with a service that has a required form → confirm step shows form inline → sign + submit → check `client_form_signatures` and `appointments.forms_completed=true`.
2. Public booking → defer → submit → `appointments.forms_required=true, forms_completed=false`.
3. Staff booking for client with no signature on file → override dialog appears → "Proceed" → audit log shows `booking_unsigned_forms_override`.
4. Kiosk check-in for appointment with `forms_required=true` → routed to `KioskFormSigningScreen` → sign → check-in completes with `forms_completed=true`.

### Prompt feedback

Clean prompt — *"Lets work on these items: [list of three deferred items]"* with explicit references is exactly the right framing after a multi-wave audit. I knew the scope, the source (the audit doc), and that you wanted the deferred set, not new ideas.

To level up: **rank within the deferred set.** Of the three items you listed, the first (true gating) is a 2-day Phase 4 build, the second (JSON diff) is 30 min, and the third (hook unification) is a no-op after inspection. Bundling them in one ask hides that mismatch. Try: *"Ship #1 as a full wave; fold #2 and #3 into the same PR if cheap."* Pattern: **deferred-list + per-item effort signal = scope you can size before approving.**
