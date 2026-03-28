

## Add Clarity to Service Revenue Block

### Problems Identified

1. **Apples-to-oranges comparison**: The progress bar says "Earned 50% of scheduled services" using `$1,905.87` — but that's **total POS revenue** (services + retail + everything), compared against **service-only scheduled** ($3,825). The percentage is misleading.

2. **Redundancy**: The "Completed appts collected $1,517 less than booked" line and the progress bar projection tell overlapping stories. Three separate elements (tracking line, progress bar, projection) compete for attention.

3. **Missing operational context**: No appointment completion fraction (e.g., "31 of 34 appointments done") — the operator can't gauge how far through the day they are operationally.

### Proposed Changes

#### 1. Fix the progress bar comparison
Use `completedActualRevenue` (POS revenue from completed appointment clients) instead of `todayActual.actualRevenue` (total POS) for the percentage and bar fill. This makes the comparison honest: service-attributable revenue vs scheduled service revenue.

- Label: "Earned X% of scheduled services today" — now accurate
- Right-aligned amount: show `completedActualRevenue` (not total POS) so the number matches the percentage

#### 2. Remove the redundant tracking line
Delete the "Completed appts collected $X less/more than booked" line (lines 880-895). The progress bar already communicates this — if you've earned 50% of scheduled, the shortfall is self-evident. This reduces noise.

#### 3. Add appointment completion fraction
Below the "More Expected" badge, add a subtle line: **"31 of 34 appointments completed"** — gives instant operational progress without doing math.

#### 4. Keep the projection line as-is
"On track to finish at $2,307.87 service revenue" remains — it's the forward-looking complement to the earned percentage.

### Result
The block becomes:
```text
Scheduled Services Today: $3,825.00 ⓘ
[$402 More Service Revenue Expected · 3 pending]
31 of 34 appointments completed
Earned 50% of scheduled services today    $1,905.87
[████████░░░░░░░░░░░░]
On track to finish at $2,307.87 service revenue
Estimated final transaction at 7:00 PM
```

### File
- `src/components/dashboard/AggregateSalesCard.tsx` — update lines ~880-948

