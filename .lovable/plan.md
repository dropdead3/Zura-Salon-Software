

## Add "Day Concluded" State to LiveSessionIndicator

The `LiveSessionIndicator` currently returns `null` when `inSessionCount === 0`, meaning it vanishes entirely after the last appointment ends. The fix adds a "day concluded" state that appears when:
- No stylists are currently in session (`inSessionCount === 0`)
- BUT the day has had appointments (so it's not just an empty day)

### Changes

**File: `src/hooks/useLiveSessionSnapshot.ts`**

- Add a `dayHadAppointments` boolean to the return interface and query result
- When `inSessionCount === 0`, run an additional lightweight check: query `phorest_appointments` for today with `status` in `('completed', 'checked_in')` and `limit(1)` to confirm whether any appointments were serviced today
- Return `dayHadAppointments: true/false` alongside the existing fields

**File: `src/components/dashboard/LiveSessionIndicator.tsx`**

- Destructure `dayHadAppointments` from the hook
- Change the early return: instead of returning `null` when `inSessionCount === 0`, check `dayHadAppointments`
- If `dayHadAppointments` is true and `inSessionCount === 0`, render a "concluded" pill:
  - Same `rounded-full bg-background border border-border` container as the active state
  - Replace the pulsing green dot with a static `Moon` icon (matches the existing `ClosedBadge` pattern) in `text-muted-foreground`
  - Text: `"Day concluded"` in `text-xs font-medium text-muted-foreground`
  - No avatars, no click-to-drilldown — purely informational
  - No animation (the lack of pulse signals inactivity)
- If `dayHadAppointments` is false and `inSessionCount === 0`, continue returning `null` (no appointments at all today)

### Visual Comparison

```text
Active state:   [🟢 pulse]  3 stylists, 1 assistant in service now  [avatars]
Concluded state: [🌙 static]  Day concluded
No appts:        (nothing rendered)
```

### What Stays the Same

- All active-session logic, avatar rendering, drilldown behavior unchanged
- Enterprise threshold logic unchanged
- Placement in `DashboardHome.tsx` unchanged — same flex container, same position

