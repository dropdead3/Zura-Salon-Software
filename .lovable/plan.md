
## Decision: Option C — Data fix, no code change

The current filter logic in `NewClientStep.tsx` is correct: it shows stylists whose `location_id = 'north-mesa'` OR who have a `north-mesa` entry in `location_schedules`. The 5 stylists displayed (Alexis, Brooklyn, Cienna, Samantha, Trinity) are exactly the ones the data says work at North Mesa. Other stylists (Gavin, Sarina, Jamie, Hayleigh, etc.) have `location_id = 'val-vista-lakes'` and no Mesa schedule entry.

## What you need to do

This is an operational data update, not a code change. For each stylist who should appear at North Mesa but doesn't, choose one of two paths:

**Path 1 — Primary location change**
If the stylist has *moved* to North Mesa permanently:
- Go to **Operations Hub → Team Management** → open the stylist's profile → change their **Primary Location** to North Mesa.

**Path 2 — Multi-location schedule (recommended for stylists who split time)**
If the stylist works at *both* Val Vista and North Mesa:
- Go to the stylist's profile → **Location Schedule** section → add **North Mesa** with their working hours/days for that location.
- This keeps their primary location intact while making them eligible at Mesa.

Path 2 is the right answer for most multi-location salons — it preserves payroll/primary-site reporting while expanding booking eligibility.

## Why no code change

- The filter is doing exactly what it should: gating "Preferred Stylist" by who actually works at the chosen location.
- Loosening the filter (Option A) would let clients pick a "preferred stylist" who isn't bookable at their preferred location — creating downstream booking conflicts.
- Operational hygiene (keeping `employee_location_schedules` accurate) is a one-time setup task per stylist; loosening the code would mask it forever.

## Suggested follow-up

Once you've added the missing schedule entries, reopen Add New Client → Preferred Stylist at North Mesa and confirm the expected stylists now appear. If any are still missing, share their names and I'll check the underlying records directly.

## Optional enhancement (separate task)

Add an admin-side health check card: "X stylists have no location schedule" with a deep link to fix it. Turns this kind of data drift into a visible, fixable signal instead of a silent UX gap.
