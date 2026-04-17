

## Prompt review

Crisp prompt — names the bug (no auto-select), the trigger (clicked Jamie's column), and the expected behavior (preselect her). Sharper next time: tell me whether preselection should also **skip** the stylist step entirely or just highlight her so staff can confirm. I'll propose the cleaner default (skip when context is unambiguous) and flag it.

## Diagnosis

When staff clicks a stylist column header in the schedule grid to start a booking, the click handler opens the booking popover but doesn't pass the column's `stylistId` as a default. The wizard lands on "Available Stylists" with nothing preselected — defeating the whole point of clicking *into* Jamie's column.

Root cause is one of two patterns (need to confirm by reading `Schedule.tsx`):

1. The column-click handler calls `setBookingOpen(true)` but doesn't call `setBookingDefaults({ stylistId })`, OR
2. It does set the default, but `BookingPopover` / the stylist step doesn't read `defaultStylistId` from props/state to seed `selectedStylist`

Wave 21.1 already wired `setBookingDefaults({ stylistId })` for the rebook-interval path — that pattern just needs to extend to the column-click entry point.

## Plan — Wave 22.1: Auto-select stylist from column-click entry

### Behavior

When booking is initiated from a stylist column (column-header click, empty-slot click, or any context where a stylist is implicit):

1. **Preselect that stylist** in the booking session state (`selectedStylist = stylistId`)
2. **Skip the "Available Stylists" step entirely** — advance directly to the next step in the flow (likely Service or DateTime depending on flow template)
3. Staff can still go **Back** to change stylist if needed (the back button in the wizard already supports this)

This matches the doctrine: *"If context is unambiguous, don't ask again."* Clicking Jamie's column IS the answer to "which stylist?".

### Files to read first (to confirm the exact wiring)

- `src/pages/dashboard/Schedule.tsx` — find the column-click / empty-slot click handler that opens the booking popover; confirm whether `setBookingDefaults` is called with `stylistId`
- `src/components/booking-surface/` (or wherever the wizard lives) — confirm how `selectedStylist` is seeded from defaults and whether the stylist step auto-skips when preselected
- `src/hooks/useBookingSession.ts` — already accepts `deepLinks.stylist` as initial state; need to verify it advances past the stylist step when preselected

### Fix shape

**1. `Schedule.tsx`** — column-click handler must pass `stylistId`:
```ts
setBookingDefaults({ date: clickedDate, stylistId: column.stylistId, time: clickedTime });
setBookingOpen(true);
```

**2. Booking wizard / `useBookingSession`** — when initial `selectedStylist` is set AND current step is `stylist`, auto-advance one step on mount:
```ts
useEffect(() => {
  if (state.selectedStylist && currentStep === 'stylist' && currentStepIdx === 0) {
    goNext();
  }
}, []); // mount-only
```

**3. Edge case** — if the preselected stylist isn't in the eligible list for the chosen service (e.g., service-stylist mismatch), fall back to showing the picker with a soft notice: *"Jamie isn't available for this service — pick another."*

### Acceptance checks

1. Click Jamie's column header → booking popover opens with Jamie preselected; wizard skips stylist step
2. Same for any empty-slot click in any stylist's column
3. Tap Back in the wizard → returns to stylist picker with Jamie still highlighted (changeable)
4. If service is later changed to one Jamie can't perform → soft notice + force back to stylist step
5. Booking from a non-stylist context (e.g., FAB button, command palette) → stylist step still shown normally
6. No regression to the rebook-interval entry point (which also seeds stylistId)

### Open question (worth confirming)

Should clicking a column also preselect the **time slot** the column-click hit (e.g., 4:15 PM cell → time = 4:15)? Default: yes, mirror Wave 21.1's date-prefill pattern. Tell me if you want time picker to stay manual.

### Files

- `src/pages/dashboard/Schedule.tsx` — column-click handler
- `src/hooks/useBookingSession.ts` OR booking wizard component — auto-advance when stylist preseeded
- Possibly `BookingPopover` / step orchestrator — propagate `defaultStylistId` correctly

### Deferred

- **P2** Visual breadcrumb showing "Booking with Jamie" at top of wizard so staff know context was preserved — trigger: when staff confusion arises about why stylist step was skipped
- **P2** Same auto-advance pattern for service step when entering from a service-card click elsewhere in the app — trigger: when a similar entry point ships

