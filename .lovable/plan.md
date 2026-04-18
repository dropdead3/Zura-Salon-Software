

## Status: Backfill landed correctly — but with one nuance worth flagging

### What's now in the database
- **Total appointments**: 3,095 (was 151 before)
- **Past**: 2,395 appointments back to **June 19, 2025** (~10 months of history)
- **Future**: 700 appointments out to **July 14, 2026** (~3 months forward)
- **Future weekly coverage** is healthy and tapers naturally (117 → 109 → 99 → 73 → 65 → 56 → 52 → 34 → 20 → 14 → 6 → 6 → 2)

That natural taper is the signal that we're seeing **all real bookings** — Phorest only has what clients have actually booked. The drop-off to 2 appointments in mid-July reflects reality, not a sync gap.

### About "recurring appointments"
Phorest doesn't expose a true recurring/series concept in its appointments API — every appointment is a discrete row even when a client rebooks weekly. So the question "are recurring appts pulling over?" answers itself: **every individual booked instance** Phorest knows about within our window (today → +90 days) is now in the database. There is no separate "recurring template" object being missed.

### The one nuance
The backfill pulled **today → +90 days** for the future side, capping at July 14, 2026. If a client has a booking further out than that (e.g., a wedding in October), it's not yet in the DB. Phorest allows arbitrarily-far-future bookings, but our default sync window stops at +90 days.

### Recommendation: extend forward window to +180 days

For salons with destination-event clients (weddings, holidays), 90 days forward is tight. I'd propose:

- **Quick mode (15-min cron)**: keep at today − 1 → today + 30 (cheap, covers operational reality)
- **Full mode**: extend forward edge from +90 days to **+180 days** (today − 90 → today + 180)
- Trigger one more backfill with `date_to = today + 365` to catch any far-future bookings already on the books

This keeps the cron cheap (small window) while ensuring monthly full syncs catch anything booked up to 6 months out, and the one-time +365 sweep grabs the rare 7-12 month bookings that already exist.

### Out of scope
- Phorest API "recurring booking" objects (don't exist in the API)
- Cron frequency changes
- Sales sync window (already fixed)

### Files
- **Modify**: `supabase/functions/sync-phorest-data/index.ts` — change full-mode appointment `defaultTo` from +90 to +180 days
- **Operational**: one manual `sync-phorest-data` call with `{ sync_type: 'appointments', date_from: '<today>', date_to: '<today + 365>' }` to sweep far-future bookings

