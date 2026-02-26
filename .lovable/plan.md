

## Fix: Live Session Indicator Showing "Day Concluded" Incorrectly

### Root Cause

The `useLiveSessionSnapshot` hook filters out appointments with `status: completed` from the active session query (line 51). However, Phorest marks appointments as `completed` once they're processed/paid -- often while the stylist is still physically working on the client.

Database evidence: All appointments currently within their time window (start_time <= now < end_time) have `status: completed`. The query excludes them, finds 0 active sessions, sees that completed appointments exist for today, and renders "Day concluded."

### Fix

**File: `src/hooks/useLiveSessionSnapshot.ts`**

Change the active session query to only exclude `cancelled` and `no_show` -- not `completed`. The time window filter (`start_time <= now AND end_time > now`) is already the authoritative signal for whether a stylist is currently in service. Status should not override the time-based determination.

- Line 51: Change `.not('status', 'in', '("cancelled","no_show","completed")')` to `.not('status', 'in', '("cancelled","no_show")')`

This is a one-line fix. The time window remains the source of truth for "currently in service."

