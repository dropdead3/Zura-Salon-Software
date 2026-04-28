# Add "Closing Soon" State to Locations Status Card

## Goal
Surface an amber "Closing soon" state for any location within 30 minutes of its close time, distinct from "Open" (green) and "Closed" (grey). Operationally useful for last-call decisions (walk-ins, staff release, transfers).

## Doctrine Alignment
- **Rare + material**: only fires in a 30-min window per location per day → high signal, low noise.
- **Self-suppressing**: if no location qualifies, no amber appears. Silence remains valid.
- **No new alerts, no cascades**: this is a passive state on an existing card, not a notification.

## Behavior Spec

### State machine (per location, evaluated on each 60s tick)
```text
nowMinutes < openMinutes              → "Opens at HH:MM"   (grey)
openMinutes ≤ nowMinutes < closeMinutes - 30 → "Open"      (green)
closeMinutes - 30 ≤ nowMinutes < closeMinutes → "Closing at HH:MM"  (amber)  ← NEW
nowMinutes ≥ closeMinutes             → "Closed"           (grey)
holiday / closed today                → "Closed — Holiday" (grey)
```

### Threshold
- Fixed at **30 minutes** for v1. Owner-configurable deferred to Phase 2.

### Holiday / early-close interaction
- The "closing soon" window is computed from **the day's effective close time**, whether that's standard hours or an early-close override. So an early-close at 4pm triggers amber at 3:30pm. This is the operationally correct behavior.

### Simple-view KPI tile (PinnedAnalyticsCard)
- Change `"X of Y open right now"` →
  - When ≥1 closing soon: `"X open · N closing soon"` (amber accent on the N).
  - Otherwise: `"X of Y open right now"` (unchanged).

### Visibility / suppression
- No change to existing suppression gates (single-location, uniform-schedules). Amber is a state, not a card.

## Technical Changes

### `src/components/dashboard/analytics/LocationsStatusCard.tsx`
- Extend the per-location status resolver to return a discriminated union:
  ```ts
  type LocationStatus =
    | { kind: 'open' }
    | { kind: 'closing-soon'; closeAt: string; minutesRemaining: number }
    | { kind: 'closed-today' }
    | { kind: 'opens-later'; opensAt: string }
    | { kind: 'holiday' };
  ```
- Add `CLOSING_SOON_THRESHOLD_MINUTES = 30` constant at the top of the file.
- Compute `minutesRemaining = closeMinutes - nowMinutes` and branch into `closing-soon` when `0 < minutesRemaining ≤ 30`.
- Render amber tone using existing status-color tokens (no new colors). Use `text-amber-600 dark:text-amber-400` + subtle `bg-amber-500/10` pill, matching how other transient states are styled.
- Sort order in the list: `closing-soon` appears **above** `open` so operators see the urgent ones first.

### `src/components/dashboard/PinnedAnalyticsCard.tsx`
- Update the `locations_rollup` simple-view tile renderer:
  - Compute `closingSoonCount` alongside `openCount` / `totalCount`.
  - When `closingSoonCount > 0`, render the two-part copy with the closing-soon segment in amber.
  - Keep `MetricInfoTooltip` description updated to mention the 30-min window.

### Timezone correctness (already handled, but verify)
- `useOrgNow` is location-timezone-aware — confirm the resolver consumes `nowMinutes` from the per-location timezone, not org-default. If a location lacks an override, fall back to org default (already wired via `LocationTimezoneContext`).

### Tests
- Add unit cases to whatever test harness exists for the status resolver covering:
  - 31 min before close → `open`
  - 30 min before close → `closing-soon`
  - 1 min before close → `closing-soon`
  - At/after close → `closed-today`
  - Early-close holiday at 4pm, evaluated at 3:35pm → `closing-soon`

## Out of Scope (deferred)
- Owner-configurable threshold (Phase 2 setting).
- Push/email notifications for "closing soon" — explicitly **not** added; this stays passive per alert-fatigue doctrine.
- "Just opened" mirror state — no operational value identified; skip.

## Acceptance
- Amber pill appears on cards within 30 min of close, in the location's local time.
- Simple-view tile shows `"X open · N closing soon"` only when N > 0.
- No amber state ever appears outside the 30-min window.
- Single-location and uniform-schedule suppression still hides the full card when applicable.
