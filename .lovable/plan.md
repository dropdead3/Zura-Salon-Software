

# Sales Overview Hero — Simplify the Today Summary

## Problem
The "today" view in the Sales Overview card stacks too many information lines vertically beneath the hero revenue number:
1. "Scheduled Services Today: $X" with info tooltip
2. "33 of 36 appointments completed · 3 pending · 1 awaiting checkout"
3. Yellow badge: "Service revenue still expected to collect: $387.00"
4. Progress bar: "Earned X% of scheduled services today" + dollar amount
5. "Exceeded scheduled by $X" or "On track to finish at $X"
6. "Estimated final transaction at 7:00 PM"
7. "View gap analysis" toggle
8. "Updated just now" timestamp

That is 8 distinct visual elements crammed under one number. It reads like a report, not a dashboard.

## Design Approach

Keep the hero number and its label clean. Collapse the operational detail into an expandable summary that defaults to **collapsed**.

**Collapsed state** (default) shows only:
- Hero revenue number (unchanged)
- "Revenue So Far Today" label (unchanged)
- "Excludes Tips · Incl. Tax" subtitle (unchanged)
- **One compact summary line**: progress bar + compact status text, e.g. "33/36 appts · $387 remaining · on track for $3,930" — a single scannable line
- "Updated just now" timestamp (stays at bottom)

**Expanded state** (click chevron or summary line) reveals:
- Scheduled Services Today total with tooltip
- Appointment breakdown (completed, pending, awaiting checkout, discounts)
- Yellow "still expected" badge
- Full progress bar with earned % and dollar amount
- Exceeded/on-track/final status
- Estimated final transaction time
- Gap analysis toggle + drilldown

This preserves every data point but hides the operational detail behind one click.

## Technical Changes

**File**: `src/components/dashboard/AggregateSalesCard.tsx`

1. Add a `const [todaySummaryExpanded, setTodaySummaryExpanded] = useState(false)` state variable

2. Replace the entire `mt-4 mx-auto max-w-sm space-y-3` block (lines ~826-996) with a two-state render:

   **Collapsed**: A single clickable row with:
   - Compact progress bar (h-1, no labels)
   - One-line summary: `{resolved}/{total} appts · {formatCurrency(remaining)} remaining` (or "All complete" if done)
   - Chevron icon to expand

   **Expanded**: The existing content (scheduled line, appointment fraction, badge, full progress bar, status, estimated time, gap analysis, timestamp) — wrapped in an AnimatePresence/motion.div for smooth reveal

3. Move the "Updated just now" timestamp outside both states so it always shows

4. The gap analysis toggle stays inside the expanded section — it is deep operational detail

## Visual Result
- Default view: hero number + one clean summary line + thin progress bar
- One click reveals the full breakdown the user already built
- No data is lost, just layered by importance
- Matches the calm, executive UX doctrine

## Files Modified
- `src/components/dashboard/AggregateSalesCard.tsx` (single file)

