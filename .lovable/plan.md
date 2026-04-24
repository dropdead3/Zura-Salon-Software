

## What we're building

Per-service stylist assignment that's *intelligent* about who's available — not just a long alphabetical list. Already-built pieces stay; we close three gaps so the assignment is fast, smart, and actually flows downstream.

## What already exists (don't rebuild)

- `appointment_service_assignments` table with RLS, unique on `(appointment_id, service_name)`
- `useServiceAssignments` hook (read + upsert)
- A "Reassign Stylist" dialog in `AppointmentDetailSheet.tsx` with two modes: "Entire" and "Individual Services"
- `useAssistantConflictCheck` hook returning a `Map<userId, ConflictingAppointment[]>` for the appointment's exact time block (covers lead-stylist + assistant + time-block conflicts)
- Per-service override badges already render on the Services list inside the detail sheet (lines 1746-1764)

## The three gaps

### Gap 1 — The picker isn't actually intelligent

Today: `teamMembers.filter(m => m.roles?.includes('stylist') || m.roles?.includes('admin')).slice(0, 8)` — first 8 alphabetically, no location filter, no day-of-week filter, no conflict-aware sorting. A stylist who doesn't work that day at that location is shown identically to one who's free for the next 90 minutes.

### Gap 2 — No grouping signals

Conflicts are flagged with an amber badge (good) but the list isn't *sorted* by availability. The eligible-and-free stylists should sit at the top in a "Available now" group; scheduled-but-conflicting in a second "Has conflicts" group; not-scheduled-this-day in a collapsed "Other staff at location" group; everyone else hidden behind a "Show all org staff" toggle (the stated requirement: "could technically be assigned to anyone at the location").

### Gap 3 — Writes are orphaned

The override is saved to `appointment_service_assignments` and rendered as a badge on the Services list. **Nothing else reads it.** Payroll, commission, schedule day-view cards, reports, and the `v_all_appointments` view all still attribute 100% of the appointment to `stylist_user_id`. So a manager can "reassign" a service today and the reassigned stylist gets zero credit. That's the highest-leverage gap — it makes the feature operationally meaningful instead of cosmetic.

## The fix — three layers

### Layer 1 — Intelligent eligibility hook (`useEligibleStylistsForService`)

New hook in `src/hooks/useEligibleStylistsForService.ts` that returns a ranked list per appointment + service:

```text
EligibleStylist {
  user_id, name, photo_url
  tier: 'available' | 'conflicting' | 'off_today' | 'other_location'
  reasons: string[]   // "Scheduled today", "Free 2:00–3:00 PM", "Performs this service"
  conflicts: ConflictingAppointment[]   // empty for tier='available'
}
```

Inputs already wired:
- `teamMembers` from `useTeamDirectory(undefined, { organizationId })` — has `location_schedules` (day-of-week per location) and roles
- `conflictMap` from `useAssistantConflictCheck` — exact overlap detection at appointment's start/end
- Appointment's `appointment_date`, `location_id`, `start_time`, `end_time`

Logic per stylist (excluding lead + non-stylists/non-admins):
1. **available** — assigned to this `location_id` AND `work_days[dayOfWeek]` includes today AND `conflictMap.get(user_id)` is empty
2. **conflicting** — same location + day, but has overlap
3. **off_today** — assigned to location but not scheduled this day-of-week
4. **other_location** — stylist at the org but not assigned to this location

Bonus signal (deferred but cheap if data exists): if `staff_service_compatibility` or similar table maps which stylists perform which services, add a `performs_service: boolean` flag — surface "Performs this service" as a reason and float performers above non-performers within each tier. Confirm during build whether that table exists; if not, skip without blocking.

Sort within tiers: lead stylist first if shown, then by name.

### Layer 2 — Redesigned per-service picker UI

Replace the flat `teamMembers.filter(...).slice(0, 8)` block (lines 3001-3031) with grouped sections:

```text
┌─ For: Pure Brazilian Express Keratin · 2:00–2:30 PM ───┐
│ ▼ Available now (3)                                     │
│   ◉ Samantha Bloom    Scheduled · Free                  │
│   ◯ Jamie Lee         Scheduled · Free · Performs this  │
│   ◯ Alex Rivera       Scheduled · Free                  │
│                                                         │
│ ▼ Has conflicts (2)                                     │
│   ◯ Annmarie X        ⚠ Busy 2:00–3:00 (Color)          │
│   ◯ Maria Cruz        ⚠ Assisting 1:30–2:30             │
│                                                         │
│ ▶ Off today at this location (4)                        │
│ ▶ Show all org staff (12)                               │
└─────────────────────────────────────────────────────────┘
```

Honors the doctrine — silence is valid: if no one in a tier, skip the section header. Conflicting stylists remain *selectable* (the manager may know something the system doesn't), but selecting one shows a yellow "This will create a double-booking" inline confirm before save. Same pattern as the existing assistant picker.

Keep the existing "Default" badge on the lead, the per-service container, and the "Save Assignments" footer button. The dialog footer copy updates to count *changed* services, e.g. "Save 2 changes".

### Layer 3 — Wire the override downstream (the meaningful one)

Without this, layers 1+2 are decoration. Three concrete read-paths to update:

**3a. View update** — Add a new view `v_appointment_services_resolved` (or extend `v_all_appointments`) that joins `appointment_service_assignments` and exposes a per-service resolved stylist. Shape:
```text
appointment_id, service_name, service_price, service_duration,
resolved_user_id  -- COALESCE(assignment.assigned_user_id, appointment.stylist_user_id)
resolved_staff_name
```
This becomes the canonical source for any read that needs "who actually did service X."

**3b. Schedule day-view card** — When an appointment has overrides, show a small composite avatar stack (lead + overrides) on the card. If 100% of services are reassigned to one other stylist, show *that* stylist's column instead. Out of scope for this wave but called out as the next domino — tracked in the deferral register.

**3c. Payroll / commission attribution** — `payroll_calculations` (or whichever function aggregates revenue per stylist) reads from `phorest_appointments.stylist_user_id`. Update to read from the new resolved view so commission flows to the actual performer per service. This is the structural integrity payoff: reassigning a service moves the dollars, not just the label.

For this wave, ship 3a + the payroll read-path swap. 3b can ship as a follow-up wave once the data layer is correct.

## Files involved

**New:**
- `src/hooks/useEligibleStylistsForService.ts` — the ranking hook
- `supabase/migrations/<timestamp>_v_appointment_services_resolved.sql` — joined view
- One follow-up migration to update payroll RPC(s) to read from the new view (identified during build)

**Modified:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` lines ~2980-3082 — replace flat list with grouped picker; add double-book confirm; update footer count
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` lines ~1745-1776 — Services list already shows override badge; verify it picks up the new view's resolved name when the lead is *also* changed via "Entire" mode (no behavior change expected, just tested)
- Whichever payroll aggregation function reads `stylist_user_id` to credit revenue — switch to the resolved view

**Untouched:**
- RLS policies (already correct)
- `useServiceAssignments` hook (write path is fine)
- `useAssistantConflictCheck` (perfect for this)
- "Entire" reassign mode (unchanged)

## What stays the same

- The dialog trigger ("Reassign Stylist" in the actions menu) — unchanged
- Audit log fires on `service_reassigned` — unchanged
- Per-service override badges on the Services list — unchanged
- The two-mode toggle ("Entire" / "Individual Services") — unchanged

## QA checklist

- Open an appointment with 4 services → "Reassign Stylist" → "Individual Services" → picker shows grouped sections, "Available now" first, alphabetical within
- A stylist scheduled at the location with no overlap appears in "Available now" with reason "Scheduled · Free"
- A stylist with an overlapping appointment appears in "Has conflicts" with the conflict description
- A stylist not scheduled that day-of-week sits in "Off today at this location" (collapsed)
- "Show all org staff" reveals everyone else; selecting them works (silence is valid: we don't block, we inform)
- Selecting a conflicting stylist shows the inline double-book warning before save
- After save, payroll for the appointment date credits the reassigned stylist for the per-service revenue (not the lead)
- After save, the Services list inside the detail sheet shows the override badge and the saved name (already works; regression check)
- The "Entire" reassign mode still works as it does today (no regression)
- No flicker / double-fetch when the dialog opens (the conflict query is gated on `showReassignDialog`, already correct)

## Confidence and silence

Per doctrine: when no stylist is "Available now" (all are conflicting or off), the section is hidden — not shown empty. The manager sees the conflict tier first and makes an informed call. We don't fabricate availability; absence-of-availability is meaningful information.

## Why this matters (doctrine framing)

This feature only earns its place if it *moves money* — otherwise it's a label change. Layer 3 is what makes it real: a manager reassigns a $213 keratin from Jamie to Samantha mid-day, payroll credits Samantha, commission flows to Samantha, performance reports show Samantha's revenue. Without that, we'd be re-skinning a cosmetic toggle. The structural rule "commission models must be defined before payouts" applies in reverse here too — payouts must follow the actual performer, not the label on the appointment.

## Enhancement suggestion

Worth flagging now: this is the second time in a week we've found a feature where the *write* shipped without the *read* (the first was per-service assignment as it stands today, written in Feb 2026; the related pattern was the false `[Deleted Client]` writes erasing signal). Same shape: "the write satisfied the schema; nothing consumed it; the operational truth was destroyed." That's a *write-without-read* anti-pattern worth its own short canon at `mem://architecture/write-without-read.md`: any new write path must declare which read path consumes it, or be marked experimental and excluded from "feature complete." Pairs naturally with the signal-preservation canon already in place.

