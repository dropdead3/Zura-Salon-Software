

## Move Gap Revenue Drilldown Trigger

### Current State
The gap revenue drilldown is triggered by clicking the amber "Service revenue still expected to collect: $402.00" badge. Now that this badge's purpose is purely informational (showing remaining expected revenue), attaching the drilldown to it is confusing — users expect the drilldown to relate to the *gap* between scheduled and actual, not the pending amount.

### Changes

**In `src/components/dashboard/AggregateSalesCard.tsx`:**

1. **Remove drilldown trigger from the amber badge** (line 867): Remove the `onClick={() => toggleDrilldown('expectedGap')}` and `cursor-pointer` from the Badge. Remove the wrapping Tooltip that says "Click to see Gap Report".

2. **Make "Scheduled Services Today: $3,825.00" clickable**: Add `onClick={() => toggleDrilldown('expectedGap')}` and `cursor-pointer` styling to the Scheduled Services line so clicking the scheduled total opens the gap analysis.

3. **Add a drilldown indicator below the progress bar**: After the projection line ("On track to finish at...") and before the RevenueGapDrilldown component, add a subtle clickable row with a `ChevronDown` icon (rotated when open) that says "View gap analysis" — gives a clear, discoverable entry point right under the progress bar context.

4. **Keep the RevenueGapDrilldown component in its current position** — it already renders inline below this section.

### Result
```text
Scheduled Services Today: $3,825.00 ⓘ  ← clickable, opens drilldown
31 of 34 appointments completed · 3 pending
[Service revenue still expected to collect: $402.00]  ← informational only
Earned 50% of scheduled services today    $1,905.87
[████████░░░░░░░░░░░░]
On track to finish at $2,307.87 service revenue
        ▾ View gap analysis              ← new subtle trigger
[RevenueGapDrilldown panel]
```

### File
- `src/components/dashboard/AggregateSalesCard.tsx`

