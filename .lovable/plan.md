

## Fix: Remove non-existent `duration_minutes` column from demo insert

**Problem**: The demo booking insert in `DockNewBookingSheet.tsx` line 295 writes to `duration_minutes`, which doesn't exist on the `phorest_appointments` table. This causes the "Could not find the 'duration_minutes' column" error.

**Fix**: Remove line 295 (`duration_minutes: totalDuration,`) from the insert payload in `src/components/dock/schedule/DockNewBookingSheet.tsx`. All other columns in the insert are valid.

One-line change, single file.

