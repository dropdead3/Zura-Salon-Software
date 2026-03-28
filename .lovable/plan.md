

## Problem

Add a 4th "Rebooked" tile to the Daily Brief card with a drill-down showing which stylists missed rebooks and their 30-day rebook rate.

## Gaps Found and Resolutions

1. **Count mismatch**: `useAppointmentSummary` deduplicates by client+date; `useRebookingRate` does not. The rebook tile's denominator ("completed") would differ from the Appointments tile. **Fix**: Use `useRebookingRate` for the tile (its own self-consistent count), and note in the tooltip that rebook rate is per-appointment, not per-visit.

2. **No staff-level rebook hook exists**: Neither `useRebookingRate` nor `useAppointmentSummary` returns `phorest_staff_id`. **Fix**: Create a dedicated hook for the drill-down that groups by staff.

3. **Staff name table typing**: `phorest_staff_mappings` requires `(supabase as any)` cast (existing pattern in `useWeekAheadRevenue` and `useForecastRevenue`). Follow that pattern.

4. **30-day pagination**: A busy salon could exceed 1,000 rows over 30 days. **Fix**: Use the same paginated fetch pattern from `useRebookingRate`.

5. **Demo filter**: All queries must include `is_demo=false` to match existing conventions.

## Plan

### 1. New hook: `src/hooks/useStaffRebookDrilldown.ts`

- **Props**: `date` (today), `locationId`
- **Today query**: Paginated fetch from `phorest_appointments` where `status=completed`, `appointment_date=date`, `is_demo=false`. Select `phorest_staff_id, rebooked_at_checkout`. Group by staff: count completed, count rebooked, derive missed.
- **30-day query**: Same structure but `appointment_date` range = past 30 days. Group by staff for rolling rebook rate.
- **Staff names**: Fetch from `phorest_staff_mappings` using `(supabase as any)` pattern, selecting `phorest_staff_id, staff_first_name, staff_last_name` for all staff IDs found.
- **Return**: Array of `{ staffId, name, todayCompleted, todayRebooked, todayMissed, thirtyDayRate }` sorted by todayMissed descending.

### 2. New component: `src/components/dashboard/analytics/DailyRebookDrilldown.tsx`

- **Props**: `open`, `onOpenChange`, `locationId`
- Uses `DRILLDOWN_DIALOG_CONTENT_CLASS` and `DRILLDOWN_OVERLAY_CLASS`
- **Header**: "Rebook Detail — Today" with summary line: `{totalMissed} missed rebooks`
- **Body**: `ScrollArea` with staff list. Each row shows:
  - Staff name (font-sans)
  - Today: `X of Y rebooked` — missed count in destructive color if > 0
  - 30-day rate as percentage badge (green if >= 50%, muted otherwise)
- Loading/empty/error states handled

### 3. Update: `src/components/dashboard/analytics/DailyBriefCard.tsx`

- Import `useRebookingRate` with `today, today, locationFilter` for the tile totals
- Add `useState<boolean>` for drill-down open state
- Change grid from `grid-cols-3` to `grid-cols-2 sm:grid-cols-4`
- Add 4th tile with `Repeat` icon, showing `{rebooked} / {completed}` and `{rebookRate}% rebook rate`
- Tile is clickable (cursor-pointer, hover:bg-muted/50) to open drill-down
- Render `DailyRebookDrilldown` dialog
- Update loading skeleton to show 4 tiles
- Update MetricInfoTooltip to mention rebooking

### Files modified
- `src/hooks/useStaffRebookDrilldown.ts` (new)
- `src/components/dashboard/analytics/DailyRebookDrilldown.tsx` (new)
- `src/components/dashboard/analytics/DailyBriefCard.tsx` (updated)

