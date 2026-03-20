

## Roll Back Recent Check-Ins, Keep New Client Creation

### What changes

**Remove the recent check-ins feature** from the client step while preserving the search + "New Client" flow. Checked-in clients already have appointments visible in the Schedule tab, so this list is redundant.

### Changes in `src/components/dock/schedule/DockNewBookingSheet.tsx`

**1. Remove the `RecentCheckIn` interface and the `useQuery` for `dock-recent-checkins`** (lines 42–163)
- Delete the `RecentCheckIn` type
- Delete the entire check-ins query block
- Remove the `formatDistanceToNowStrict` import from `date-fns` (if no longer needed)
- Remove unused `todayStr` variable

**2. Simplify `ClientStepDock` props and default state**
- Remove `recentCheckIns` and `isLoadingCheckIns` props
- Remove `handleSelectCheckIn`, `getMethodLabel`, `getMethodClasses` helpers
- Replace the "no search query" view (currently shows check-ins list) with a simple prompt: search bar + instructional text ("Search for a client or create a new one") + the New Client button
- Keep the search results view and "no results → create new" flow unchanged

**3. Update the `ClientStepDock` call site** (line ~390)
- Remove `recentCheckIns` and `isLoadingCheckIns` props
- Keep `DockNewClientSheet` wiring intact

