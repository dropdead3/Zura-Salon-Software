

## Clarify Date Range Labels

### Problem
"This Week" and "This Month" are ambiguous. They actually mean **week-to-date** (Monday → today) and **month-to-date** (1st → today), but a user could reasonably interpret them as the full calendar week or a rolling window.

### Solution
Relabel with explicit, unambiguous names and add dynamic date subtitles in the dropdown so the user sees the exact range.

**Label changes across all `DATE_RANGE_LABELS` maps:**

| Current Label | New Label | Dropdown Subtitle Example |
|---|---|---|
| This Week | Week to Date | Mon, Feb 24 – Today |
| This Month | Month to Date | Mar 1 – Today |
| Today to EOM | Today → End of Month | Today – Mar 31 |
| Today to Next Pay Day | Today → Next Pay Day | Today – Mar 15 |
| Last Month | Last Month | Feb 1 – Feb 28 |
| Last 7 days | Last 7 Days | _(no subtitle needed)_ |
| Last 30 days | Last 30 Days | _(no subtitle needed)_ |

### Approach
1. Create a shared utility `getDateRangeSubtitle(key)` that returns a short human-readable date span string (e.g., "Mon, Feb 24 – Today") for the current moment
2. Update `DATE_RANGE_LABELS` in all 4 locations (AnalyticsFilterBar, AnalyticsFilterBadge, CommandCenterAnalytics, AggregateSalesCard) to use the new labels
3. In the `SelectItem` dropdowns, render the subtitle as a secondary line (`text-[11px] text-muted-foreground`) beneath the label so the user sees the exact date window before selecting

### Visual (Dropdown)
```text
┌──────────────────────────┐
│  Last Month              │
│  Last 30 Days            │
│  Last 7 Days             │
│  Yesterday               │
│  Today                   │
│  ─────────────────────── │
│  Week to Date            │
│  Mon, Feb 24 – Today     │  ← subtle subtitle
│  ─────────────────────── │
│  Month to Date           │
│  Mar 1 – Today           │  ← subtle subtitle
│  ─────────────────────── │
│  Today → End of Month    │
│  Today – Mar 31          │
└──────────────────────────┘
```

### Files
1. **New: `src/lib/dateRangeLabels.ts`** — Single source of truth for labels + `getDateRangeSubtitle()` utility
2. **`src/components/dashboard/AnalyticsFilterBar.tsx`** — Import shared labels, render subtitles in SelectItems
3. **`src/components/dashboard/AnalyticsFilterBadge.tsx`** — Import shared labels
4. **`src/components/dashboard/CommandCenterAnalytics.tsx`** — Import shared labels, render subtitles
5. **`src/components/dashboard/AggregateSalesCard.tsx`** — Import shared labels

