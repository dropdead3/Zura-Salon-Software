

# Fix Walk-In Badge Logic

## Problem

The "Walk-In" badge currently appears on any appointment missing a `phorest_client_id`. This is too broad -- appointments created through the booking wizard (like Eric Day's) may not have a linked Phorest client ID but are not walk-ins. The badge should only appear for genuine walk-in scenarios.

## Solution

**File: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (line 479)**

Change the `isWalkIn` detection from the current broad check to a more precise condition. A true walk-in is an appointment where:
- There is no `phorest_client_id`, AND
- There is no `client_name` (anonymous/unknown client)

Appointments with a name but no Phorest client link are simply unlinked clients, not walk-ins.

```text
Before:  const isWalkIn = appointment ? !appointment.phorest_client_id : false;
After:   const isWalkIn = appointment ? (!appointment.phorest_client_id && !appointment.client_name) : false;
```

This single-line change ensures:
- Eric Day (has name, no client ID) -- no badge
- Anonymous appointments (no name, no client ID) -- badge shown
- Linked clients (has client ID) -- no badge regardless of name

All downstream uses of `isWalkIn` (History tab collapse, Client Notes visibility, badge rendering) will automatically reflect the corrected logic.

