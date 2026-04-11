

# Remove Remaining Redundancies in Today Hero Expanded Section

## Problem

The pill button already displays a compact summary: `33/36 appts · $387.00 remaining · on track for $4,316.79`. The expanded section then repeats all three data points:

1. **Appointment count repeated** — pill says "33/36 appts", expanded says "33 of 36 appointments completed · 3 pending"
2. **Remaining amount repeated** — pill says "$387.00 remaining", expanded shows a large warning badge "Service revenue still expected to collect: $387.00"
3. **Exceeded/on-track repeated** — pill says "on track for $X" or "exceeded by $X", expanded shows the same with a checkmark icon

## Approach

Keep the pill as the single source for summary metrics. The expanded section should only show **detail the pill cannot contain**: the scheduled total, the breakdown (pending/awaiting/discounts), estimated finish time, and gap analysis.

## Changes — `src/components/dashboard/AggregateSalesCard.tsx`

1. **Remove the appointment count line** (lines 926-934) — the pill already has "33/36 appts"; expanded doesn't need to restate it. Move the "awaiting checkout" and "discounts applied" details into a subtle inline note under the Scheduled Services line instead.

2. **Remove the remaining revenue badge** (lines 937-949) — "$387 remaining" is already in the pill. Redundant.

3. **Remove the exceeded/on-track status block** (lines 952-965) — "exceeded by $X" is already in the pill. Redundant.

4. **Remove the "All appointments complete" block** (lines 968-982) — "All complete" is already in the pill text.

5. **Keep in expanded section**:
   - Scheduled Services Today total (with tooltip) — this is the only place it appears
   - Awaiting checkout count + discounts as a subtle detail line beneath the scheduled total
   - Estimated final transaction time (operational detail)
   - Gap analysis trigger + drilldown

### Result
Expanded section becomes: Scheduled total → operational details (awaiting checkout, discounts) → estimated finish time → gap analysis. No repeated metrics.

### File Modified
| File | Change |
|---|---|
| `src/components/dashboard/AggregateSalesCard.tsx` | Remove 4 redundant blocks from expanded section; consolidate awaiting/discount detail into single subtle line |

