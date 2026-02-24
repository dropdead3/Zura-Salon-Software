

## Add On-Track / Off-Track Status Indicator to Goal Tracker Card

The compact Goal Tracker card currently shows "On track to hit goal" or "Falling behind target pace" as plain text. This change adds a visual status icon inline with that label to reinforce the signal at a glance.

### What Changes

**File:** `src/components/dashboard/PinnedAnalyticsCard.tsx`

Two changes in the `goal_tracker` case and the compact card rendering area:

1. **Store pace status for rendering** (line 444-447): Add a variable `goalPaceStatus` alongside the existing `metricValue`/`metricLabel` so the rendering block can conditionally show an icon.

2. **Render status icon** (line 512-514): When rendering the `metricLabel` for `goal_tracker`, prepend a small icon:
   - **On track / Ahead**: Green `CheckCircle2` icon (from lucide-react) with `text-emerald-500`
   - **Behind**: Amber `AlertTriangle` icon with `text-amber-500`

### Visual Result

```
83%
[green check] On track to hit goal

-- or --

63%
[amber warning] Falling behind target pace
```

### Technical Detail

- Declare a `goalPaceIcon` variable in the switch block alongside `metricValue`/`metricLabel`
- In the render section (line 512-514), check if `goalPaceIcon` is set and render it as a small inline icon (`w-3.5 h-3.5`) to the left of the label text using `flex items-center gap-1`
- Icons used: `CheckCircle2` (already available in lucide-react) for ahead/on-track, `AlertTriangle` for behind
- No new dependencies, hooks, or props required
- Follows the design token typography rules (no bold, muted-foreground for the label text)

### Scope

Single file edit. Approximately 10 lines added.
