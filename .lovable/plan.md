

## Add Location Filter to Backroom Insights Section

### Change

Add a location dropdown to `BackroomInsightsSection` that lets users toggle between "All Locations" and individual locations. Pass the selected location through to all child hooks and components.

### Implementation

**File:** `src/components/dashboard/backroom-settings/BackroomInsightsSection.tsx`

1. Import `useActiveLocations` from `@/hooks/useLocations` and `MapPin` from lucide
2. Add `selectedLocationId` state (default `'all'`)
3. Place a location `Select` dropdown next to the existing date preset dropdown in the header (same row, before the date select)
   - Trigger: `MapPin` icon + location name, styled `w-fit rounded-full` to match the catalog's new dropdown
   - "All Locations" as first option, then each active location
   - Only rendered when `activeLocations.length > 1`
4. Derive `effectiveLocationId = selectedLocationId === 'all' ? undefined : selectedLocationId`
5. Pass `effectiveLocationId` to:
   - `useBackroomAnalytics(start, end, effectiveLocationId)` (line 53)
   - `useBackroomStaffMetrics(start, end, effectiveLocationId)` (line 54)
   - `BackroomHistoryChart` — add `locationId` prop, pass to `useBackroomHistory`
   - `BackroomBrandUsageCard` — add `locationId` prop, pass to `useBackroomBrandUsage`

**File:** `src/components/dashboard/backroom-settings/BackroomHistoryChart.tsx`

- Add optional `locationId?: string` to Props
- Pass it to `useBackroomHistory(startDate, endDate, bucketMode, locationId)`

**File:** `src/components/dashboard/backroom-settings/BackroomBrandUsageCard.tsx`

- Add optional `locationId?: string` to Props
- Pass it to `useBackroomBrandUsage(startDate, endDate, locationId)`

### Files
- `BackroomInsightsSection.tsx` — location state + dropdown + pass-through
- `BackroomHistoryChart.tsx` — accept & forward `locationId`
- `BackroomBrandUsageCard.tsx` — accept & forward `locationId`

