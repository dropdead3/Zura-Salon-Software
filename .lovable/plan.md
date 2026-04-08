

# Separate Report Generator from Analytics Hub

## Why This Is Right

Analytics and Reports serve fundamentally different operator intents:

| | Analytics Hub | Report Generator |
|---|---|---|
| **Purpose** | Observe trends, detect drift, surface levers | Generate structured exports for stakeholders |
| **Interaction** | Browse, drill down, pin to Command Center | Configure, generate, download, schedule |
| **Output** | Visual dashboards, KPI cards | PDFs, CSVs, scheduled emails |
| **Audience** | Owner in daily workflow | Accountants, partners, lenders, team leads |

Keeping Reports as tab #7 inside Analytics buries it. Operators looking to "run a report" shouldn't need to navigate through a visual intelligence hub.

---

## What Changes

### 1. Promote Report Generator to sidebar nav item
- Add "Report Generator" as a new sidebar item under the **Manage** section, directly below "Analytics Hub"
- Icon: `FileText`
- Route: `/admin/reports`

### 2. Create dedicated Report Generator page
- Repurpose the existing `ReportsHub.tsx` (currently 329 lines, mostly unused since it redirects)
- Move the full `ReportsTabContent` logic into this standalone page
- Add `DashboardPageHeader` with title "Report Generator" and description "Generate, schedule, and export business reports"
- Include location filter and date range controls (already exist in ReportsTabContent)
- Retain all sub-tabs: Sales, Staff, Clients, Operations, Financial, Custom Builder, Scheduled

### 3. Remove Reports tab from Analytics Hub
- Remove `{ id: 'reports', label: 'Reports', icon: FileText }` from `baseCategories` in `AnalyticsHub.tsx`
- Remove the `ReportsTabContent` import and its `TabsContent`
- Update the redirect route (`admin/reports`) to point to the new standalone page instead of `analytics?tab=reports`

### 4. Add cross-navigation hints
- In Analytics Hub, add a subtle "Generate Reports →" link in the page header actions area
- In Report Generator, add a "← Back to Analytics" breadcrumb link

### 5. Sidebar layout editor update
- Add the new `/dashboard/admin/reports` entry to the `SidebarLayoutEditor` label map

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/dashboard/admin/ReportsHub.tsx` | Rewrite as standalone Report Generator page (absorb ReportsTabContent logic) |
| `src/pages/dashboard/admin/AnalyticsHub.tsx` | Remove Reports from `baseCategories`, remove tab content |
| `src/App.tsx` | Update `admin/reports` route from redirect → standalone page |
| `src/components/dashboard/settings/SidebarLayoutEditor.tsx` | Add Report Generator to label map |
| Sidebar nav config (wherever nav items are defined) | Add "Report Generator" item under Manage section |

5 files, no database changes. The `ReportsTabContent.tsx` component can be preserved as-is and imported into the new standalone page, minimizing risk.

