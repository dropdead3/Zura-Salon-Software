

## Rename "Daily Brief" → "Appointments Summary"

### Scope

Update the display label in 5 files. The `elementKey` (`daily_brief`) stays unchanged to preserve existing visibility/pinning data in the database.

### Changes

**1. `src/components/dashboard/analytics/DailyBriefCard.tsx`**
- Line 49: `"Failed to load daily brief."` → `"Failed to load appointments summary."`
- Line 90: `Daily Brief` → `Appointments Summary`

**2. `src/components/dashboard/CommandCenterAnalytics.tsx`**
- Line 221: `elementName="Daily Brief"` → `elementName="Appointments Summary"`

**3. `src/components/dashboard/PinnedAnalyticsCard.tsx`**
- Line 214: `label: 'Daily Brief'` → `label: 'Appointments Summary'`
- Line 780: `elementName="Daily Brief"` → `elementName="Appointments Summary"`

**4. `src/components/dashboard/DashboardCustomizeMenu.tsx`**
- Line 184: `label: 'Daily Brief'` → `label: 'Appointments Summary'`

**5. `src/components/dashboard/previews/AnalyticsCardPreview.tsx`**
- Line 81: Rename function `DailyBriefPreview` (optional, internal)
- Line 84: `title="DAILY BRIEF"` → `title="APPOINTMENTS SUMMARY"`

### What stays the same
- `elementKey: "daily_brief"` — unchanged everywhere so existing DB visibility rows and pinned layout entries continue to work
- File name `DailyBriefCard.tsx` — cosmetic, no functional impact, avoids import churn

