

# Fix Redundant Filters on Backroom Overview → Analytics Tab

## Problem
The Overview page has its own location + date filters (lines 166-193). When the "Analytics" sub-tab is selected, `BackroomInsightsSection` renders a second independent set of location + date filters. This creates visual redundancy and confusing UX — two filter bars that don't sync with each other.

## Solution
Pass the parent's filter state down to `BackroomInsightsSection` as props. When props are provided, the component hides its own filters and uses the parent's values instead.

## Changes

### 1. `BackroomInsightsSection.tsx`
- Add optional props: `locationId?: string`, `datePreset?: DatePreset`, `hideFilters?: boolean`
- When these props are provided, use them instead of internal state
- Conditionally hide the filter bar when `hideFilters` is true

### 2. `BackroomDashboardOverview.tsx` (line 459)
- Pass the parent's `selectedLocationId` and `datePreset` down:
  ```tsx
  <BackroomInsightsSection
    locationId={selectedLocationId}
    datePreset={datePreset}
    hideFilters
  />
  ```
- Also remove the redundant `rangeLabel` text badge next to the overview filters (line 192) — the selected value in the dropdown already shows this

