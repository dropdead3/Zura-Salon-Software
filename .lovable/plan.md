

## Fix Contradictory Service Revenue Metrics

### Problem
The three data points currently contradict each other because they use different baselines:
- "Scheduled Services Today: $402" uses the **adjusted** number (actual completed + pending scheduled)
- "Exceeded" compares **total POS revenue** ($1,905) against that $402
- "Tracking $3,423 below" compares completed actual vs completed scheduled

This creates an impossible read: "You exceeded expectations" AND "You're $3,423 below." The metrics are answering different questions with different denominators.

### Solution
Align all three lines to a single, intuitive story using the **original scheduled total** as the anchor:

1. **Scheduled Services Today: $X** → Use `originalExpected` (the full sum of all appointments originally booked, before cancellations/no-shows). This is "what was on the books."

2. **Remaining badge** → Show `pendingScheduledRevenue` as "More Expected" — appointments not yet completed. This answers "how much is left to collect."

3. **Tracking indicator** → Compare `todayActual.actualRevenue` (total POS collected so far) against `originalExpected - pendingScheduledRevenue` (what should have been collected by now based on resolved appointments). OR simpler: compare total actual vs total original scheduled to show "on track / behind / ahead" for the full day.

### Changes in `AggregateSalesCard.tsx` (lines ~810-910)

- **Line 1**: Change `displayExpected` from `adjustedExpected.adjustedExpected` to `adjustedExpected.originalExpected` — show the original booking total
- **Exceeded check**: Compare actual revenue against `originalExpected` (not adjusted), so "Exceeded" only shows when you've truly surpassed what was booked
- **Remaining**: Keep using `pendingScheduledRevenue` — this correctly shows what's still outstanding
- **Tracking line**: Compare actual revenue collected so far against `completedScheduledRevenue` (what completed appointments were supposed to bring in). This cleanly answers "are completed appointments delivering what was booked?"
- **Remove the separate "Exceeded Scheduled Services" badge** — fold this into the tracking line logic (if actual > scheduled for completed, show "above"; if not, show "below")

### Result
The user sees one coherent narrative:
- "Scheduled Services Today: $5,325" (original total booked)
- "$402 More Expected" (pending appointments)
- "Tracking $3,423 below scheduled" (completed appointments underdelivered)

No contradictions. One baseline. Clear story.

### Files
- `src/components/dashboard/AggregateSalesCard.tsx` — update the service revenue info block logic

