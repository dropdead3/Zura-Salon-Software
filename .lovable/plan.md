
## Prompt review

Strong prompt — you justified the rename ("you can actually create an appointment, meeting or break") which makes the intent unambiguous and prevents me from second-guessing. Teaching note: pairing a UI change with the *why* (the button opens `ScheduleTypeSelector` with three branches) is exactly how to keep copy decisions traceable. Micro-improvement: you could also specify casing convention ("Add Event" title case vs "Add event" sentence case) — I'll match the existing button's title-case pattern.

## Diagnosis

`src/components/dashboard/schedule/ScheduleActionBar.tsx` currently renders `Create Appointment` with a `Plus` icon. The button triggers `onCreateAppointment`, which in dual-role contexts opens `ScheduleTypeSelector` (Client Appointment / Internal Meeting / Timeblock-Break). Label is too narrow for actual scope.

## Fix

In `src/components/dashboard/schedule/ScheduleActionBar.tsx`, change the button text from `Create Appointment` to `Add Event`. The leading `+` is already provided by the `Plus` icon — no need to add a literal `+` to the string (would double up).

No other files reference this label as a string match for behavior. Sizing, padding, and icon stay as-is from the previous change.

## Acceptance checks

1. Button reads "+ Add Event" (Plus icon + "Add Event" text).
2. Click still opens the type selector / appointment wizard.
3. No layout shift (string is shorter, button shrinks naturally with `shrink-0` + intrinsic width).
4. Title case preserved to match platform copy convention.

## Out of scope

- Renaming the underlying handler `onCreateAppointment` (internal name, no user impact).
- Updating `ScheduleTypeSelector` heading copy ("What would you like to schedule?" already matches the broader scope).

## File touched

- `src/components/dashboard/schedule/ScheduleActionBar.tsx` — replace button label text.
