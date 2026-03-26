

## Add Sub-Tabs to Backroom Analytics Section

### Problem
The Analytics tab in the Backroom Hub renders all content vertically in one long scroll: KPI strip, Product Analytics, Employee Performance table, History Chart, and Brand Usage — making it hard to digest.

### Solution
Add `SubTabs` navigation below the KPI strip to break the remaining content into focused sections. The KPI strip stays pinned above the tabs as a persistent summary.

### Tab Structure

| Tab | Content |
|-----|---------|
| **Products** (default) | `BackroomProductAnalyticsCard` |
| **Staff** | Employee Performance table (sortable, exportable) |
| **Trends** | `BackroomHistoryChart` |
| **Brands** | `BackroomBrandUsageCard` |

### Changes

**File: `src/components/dashboard/backroom-settings/BackroomInsightsSection.tsx`**

1. Import `Tabs, TabsContent, SubTabsList, SubTabsTrigger` from `@/components/ui/tabs`
2. Keep the header (title + filters) and KPI cards grid outside the tabs — always visible
3. Wrap the four content blocks in a `<Tabs defaultValue="products">` with `SubTabsList` / `SubTabsTrigger` for the underline-style nav
4. Each block goes into its own `<TabsContent>`:
   - `products` → `<BackroomProductAnalyticsCard />`
   - `staff` → The existing Employee Performance `<Card>` block (lines 198-313)
   - `trends` → `<BackroomHistoryChart />`
   - `brands` → `<BackroomBrandUsageCard />`

No new files needed. The data hooks already only run when their parent renders, so no wasted queries — each tab's content mounts on activation.

