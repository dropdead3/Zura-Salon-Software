

## Move Usage Frequency Into Products Sub-Tab

### Problem
`ProductUsageFrequencyTable` is rendered as a sibling **after** `BackroomInsightsSection` inside the Analytics tab of `BackroomDashboardOverview.tsx` (line 462). Since the sub-tabs (Products / Staff / Trends / Brands) live *inside* `BackroomInsightsSection`, the Usage Frequency table sits below them and appears regardless of which sub-tab is active.

The same issue applies to the other cards after `BackroomInsightsSection`: `WasteCategoryBreakdownCard`, `ServicePLReport`, `BackroomInventoryValuationCard`, and `SeasonalDemandOverlay`.

### Solution
Move the extra analytics cards from `BackroomDashboardOverview` into the appropriate sub-tabs inside `BackroomInsightsSection`:

| Card | Move to sub-tab |
|------|-----------------|
| `ProductUsageFrequencyTable` | **Products** |
| `WasteCategoryBreakdownCard` | **Products** |
| `ServicePLReport` | **Trends** |
| `BackroomInventoryValuationCard` | **Products** |
| `SeasonalDemandOverlay` | **Trends** |

### Changes

**File: `src/components/dashboard/backroom-settings/BackroomInsightsSection.tsx`**
- Accept new optional props: `showExtendedAnalytics`, `wasteByCategory`, `totalWasteQty`
- Import the five card components
- Render them inside their respective `<TabsContent>` blocks

**File: `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx`**
- Remove the five card renders from the Analytics `TabsContent` (lines 455-462)
- Pass `showExtendedAnalytics`, `wasteByCategory`, and `totalWasteQty` props to `BackroomInsightsSection`

This ensures each card only appears under its relevant sub-tab.

