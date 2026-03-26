

## Promote Backroom Analytics to Its Own Sidebar Section

### What's Changing
The Analytics tab currently lives inside the Overview page's internal tab bar (Command Center / Analytics / AI Intelligence). It will be promoted to a top-level sidebar entry under the **Operations** group, giving it direct one-click access.

### Changes

**1. `src/pages/dashboard/admin/BackroomSettings.tsx`**
- Add `'analytics'` to the `BackroomSection` union type
- Insert a new entry in the `sections` array under the **Operations** group, after Overview:
  - `{ id: 'analytics', label: 'Analytics', icon: BarChart3, tooltip: 'Product usage, staff performance, and trend analytics.', group: 'operations' }`
- Add a rendering case for `activeSection === 'analytics'` that renders `<BackroomInsightsSection>` with the same props currently used in the Overview page (location filter, date preset, extended analytics, waste data)

**2. `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx`**
- Remove the "Analytics" tab from the internal `<Tabs>` component (keep only Command Center and AI Intelligence)
- Remove the `<TabsContent value="analytics">` block and the `BackroomInsightsSection` import (if no longer used here)

### Result
- Sidebar: Overview, **Analytics**, Inventory, Price Intelligence, Reweigh Reports (under Operations)
- Overview page: Only shows Command Center and AI Intelligence tabs
- Analytics page: Full `BackroomInsightsSection` with its own location/date filters at the top level

