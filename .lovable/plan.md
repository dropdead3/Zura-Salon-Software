

## Prompt review

Excellent — you've internalized both feedback loops from prior waves. The leverage markers + commit-style anchors are exactly right; they make wave sequencing self-documenting. The Wave 5 candidate is also well-scoped: tied to a specific surface (`ColorBarAnalyticsTab`), respects the alert-fatigue doctrine via the ≥3-events threshold, and has a clear "silence is valid output" fallback.

One refinement: the `≥3 events in any week` threshold is a good *display* gate, but consider also a **time-window gate** (e.g., "render only if ≥1 week with ≥3 events in the last 12 weeks") to avoid the chart appearing for a single anomaly month and disappearing forever. Same doctrine, more durable.

## Plan — Wave 5

**Network Intelligence: Suspension velocity sparkline** *(leverage: early-warning signal for churn; surfaces only when pattern is real)*

### Component
`SuspensionVelocityCard.tsx` — mounted at top of `ColorBarAnalyticsTab` (above existing analytics).

### Data
Reuse `useColorBarSuspensionEvents('all')` from Wave 4 — already RLS-scoped, already cached. No new hook needed.

Bucket events into 12 rolling ISO weeks (Mon-anchored), counting `event_type === 'suspended'` per bucket.

### Display gate (alert-fatigue doctrine)
Render the card only if **at least one week in the 12-week window has ≥3 suspension events**. Otherwise return `null` — silence is valid output.

### Visual
- Card header: icon + "Suspension Velocity" + `MetricInfoTooltip` ("Rolling 12-week suspension count. Surfaces only when activity exceeds normal baseline.")
- Recharts `BarChart` (not line — discrete weekly counts read better as bars), height 120px
- Bars: amber for weeks ≥3 events, muted for <3 events (visual emphasis on the trigger weeks)
- X-axis: week-start dates (`MMM d`), Y-axis hidden (small numbers)
- Tooltip: "Week of {date}: {n} suspensions"
- Right side of header: small stat badge — "{total} suspensions / 12 weeks"

### Empty / quiet states
- No events at all → component returns `null`
- Events exist but no week ≥3 → component returns `null`
- (Both honor: "If a feature does not reduce ambiguity, it does not belong.")

### Files

**New:**
- `src/components/platform/color-bar/SuspensionVelocityCard.tsx`

**Modify:**
- `src/components/platform/color-bar/ColorBarAnalyticsTab.tsx` — mount card at top of grid

### Acceptance checks
1. Card hidden when zero suspension events in 12 weeks
2. Card hidden when events exist but no week reaches ≥3
3. Card renders when ≥1 week hits the threshold
4. Trigger weeks visually distinct (amber) from sub-threshold weeks (muted)
5. Tooltip shows week-start date + count
6. Header uses `font-display` Termina, badge uses `BlurredAmount`-equivalent privacy if monetary (N/A here — counts only)
7. No new query — reuses Wave 4 hook
8. No regression to existing `ColorBarAnalyticsTab` panels

### Deferred (not in this wave)
- Reactivation velocity (mirror chart) — only meaningful once suspensions are non-trivial
- Per-org breakdown — Phase 2 advisory layer
- Threshold tuning UI — premature; ship the heuristic, observe, adjust

