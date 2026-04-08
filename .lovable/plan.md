

# Bug & Gap Analysis — Pass 6

## Bugs

### Bug 1 (Medium): `ScheduleReportForm` crashes when `locations` is undefined
Line 266: `locations.length > 1` accesses `.length` on the result of `useActiveLocations()`, which returns `undefined` while loading. This will throw a runtime error on first render before locations load.

**Fix:** Change to `(locations?.length ?? 0) > 1`. Also fix line 73 where `locations?.length || 1` is already safe, but the JSX access is not.

### Bug 2 (Medium): `useUpdateScheduledReport` loses existing `schedule_config` when only `schedule_type` changes
Line 187-190: `calculateNextRunTime(effectiveType, updates.schedule_config)` — if only `schedule_type` is updated (e.g., changing from weekly to daily), `updates.schedule_config` is `undefined`. The function then defaults to `dayOfWeek: 1` and `timeUtc: 09:00`. The user's configured delivery time and day preferences are silently discarded.

**Fix:** When `updates.schedule_config` is undefined, fetch the existing `schedule_config` from the database alongside `schedule_type` (already fetched on line 180-184). Use the existing config as fallback:
```
const { data: existing } = await supabase
  .from('scheduled_reports')
  .select('schedule_type, schedule_config')
  .eq('id', id)
  .single();
const effectiveConfig = updates.schedule_config || existing?.schedule_config;
```

### Bug 3 (Low): `client-birthdays` batch report doesn't show birthday column
Lines 175-195: The `client-birthdays` case falls through to the generic client handler which renders `[Client, Email, Spend, Visits]`. The `birthday` field is selected in the query but never included in the output columns. The report is misleading — users expect to see birthday dates.

**Fix:** Add a dedicated handler for `client-birthdays` that includes the birthday column and filters to clients with birthdays set.

### Bug 4 (Low): `duplicate-clients` batch report doesn't detect duplicates
Same generic handler — the report just lists clients. It doesn't filter by `is_duplicate = true` or group by matching names/emails. The interactive `DuplicateClientsReport` component does real duplicate detection; the batch version is a generic client list.

**Fix:** Add `.eq('is_duplicate', true)` filter and show relevant columns (name, email, phone) to help identify duplicates.

### Bug 5 (Low): `demand-heatmap` batch report is just an appointment list
Lines 199-222: Falls through to the generic appointments handler showing Date/Time/Client/Staff/Price. A heatmap should aggregate appointments by day-of-week and hour. The batch version provides no heatmap analysis.

**Fix:** Add a dedicated handler that aggregates by `appointment_date` day-of-week and `start_time` hour, producing a summary table.

### Bug 6 (Low): `location-benchmark` batch report is a generic category summary
Lines 231-259: Falls through to the generic transaction handler which groups by `item_type`. The interactive `LocationBenchmarkReport` compares metrics across locations. The batch version provides no location comparison.

**Fix:** Add a dedicated handler that groups transactions by `location_id` and computes per-location revenue, appointment counts, etc.

## Gaps

### Gap 1: Several batch reports produce generic/misleading output
Reports `client-birthdays`, `duplicate-clients`, `demand-heatmap`, `location-benchmark`, `compensation-ratio`, `service-profitability`, `chemical-cost`, and `tax-summary` all fall through to generic handlers. The batch PDF output doesn't match what the interactive report shows. Users downloading a "Tax Summary" PDF get a category revenue breakdown — no tax data.

### Gap 2: No "Select All" / category toggle in `ScheduleReportForm`
`BatchReportDialog` has `toggleCategory` for bulk selection. `ScheduleReportForm` lacks this — each report must be individually checked.

---

## Fix Plan

| File | Change |
|---|---|
| `ScheduleReportForm.tsx` | Fix `locations.length` crash → `locations?.length ?? 0` |
| `useScheduledReports.ts` | Fetch existing `schedule_config` alongside `schedule_type` when recalculating `next_run_at` |
| `useBatchReportGenerator.ts` | Add dedicated handlers for `client-birthdays` (filter + show birthday), `duplicate-clients` (filter `is_duplicate`), `demand-heatmap` (aggregate by day/hour), and `location-benchmark` (group by location) |

3 file edits. No migrations. Bug 1 is a crash risk on every render before locations load.

