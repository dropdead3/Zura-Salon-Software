

# Break Down Total Revenue by Services, Retail & Tips

## Problem
The "Total Revenue" KPI tile on the 1:1 Performance Summary shows a single number. It should break this down into Services, Retail, and Tips — and clarify whether tips are included or excluded from the total.

## Data Availability
The hook (`useIndividualStaffReport`) already returns:
- `revenue.service` — service revenue from transaction items
- `revenue.product` — product/retail revenue from transaction items
- `experienceScore.tipRate` — tip rate as % of total revenue
- Tips total can be derived: `revenue.total * (tipRate / 100)`

Note: `revenue.total` comes from `phorest_appointments.total_price` which may or may not include tips depending on POS config. We need to also expose `totalTips` directly from the hook (it's computed but not returned).

## Changes

### 1. `src/hooks/useIndividualStaffReport.ts`
- Add `tips: number` to the `StaffRevenue` interface
- Return `totalTips` in the revenue object so it's directly accessible

### 2. `src/components/coaching/MeetingPerformanceSummary.tsx`
- Replace the single "Total Revenue" KPI tile with a stacked breakdown:
  - Keep "Total Revenue" as the primary value at the top
  - Add sub-lines below in `text-xs text-muted-foreground`:
    - Services: `$X,XXX`
    - Retail: `$X,XXX`
    - Tips: `$X,XXX`
  - Add a subtle label: "excl. tips" or "incl. tips" based on whether tips are part of the total
- Keep the trend badge and team avg comparison on the total

## Files Changed
| File | Change |
|---|---|
| `useIndividualStaffReport.ts` | Add `tips` to StaffRevenue, return `totalTips` |
| `MeetingPerformanceSummary.tsx` | Add service/retail/tips breakdown lines under Total Revenue tile |

2 files, no database changes.

