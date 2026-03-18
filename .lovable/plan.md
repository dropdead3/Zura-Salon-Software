

# Consolidate Overview, Supply Intelligence & Insights into One Section

## What Exists Today

| Section | Content |
|---------|---------|
| **Overview** (457 lines) | Setup banner, 5 KPI tiles, Control Tower alerts, Procurement snapshot, Staff top/bottom 3, Inventory Health, Quick Actions |
| **Supply Intelligence** (316 lines) | AI KPIs, Product Cost Trends, Digest/Alert settings, AI Insight Feed, Benchmarking placeholder |
| **Insights** (253 lines) | Date/location filters, 5 KPI cards (overlap with Overview), Employee Performance table, History Chart, Brand Usage |

The overlap: both Overview and Insights show Chemical Cost, Waste Rate, and Reweigh Compliance KPIs. Supply Intelligence adds AI-generated analysis of the same underlying data. Three sidebar entries for closely related content.

## Proposed Consolidation

Merge all three into a single **"Overview"** section with internal sub-tabs to organize depth:

```text
┌─────────────────────────────────────────────┐
│  Overview (single sidebar entry)            │
│                                             │
│  [Setup Banner - if incomplete]             │
│  [KPI Strip - 5 tiles]                     │
│                                             │
│  Sub-tabs: Command Center │ Analytics │ AI  │
│                                             │
│  Command Center: Control Tower + Procurement│
│               + Staff summary + Inv Health  │
│               + Quick Actions               │
│                                             │
│  Analytics:   Date/Location filters         │
│               Detailed KPI cards            │
│               Employee Perf table           │
│               History Chart + Brand Usage   │
│                                             │
│  AI:          Supply AI KPIs + Health badge │
│               Product Cost Trends           │
│               Intelligence Feed             │
│               Digest & Alert Settings       │
│               Benchmarking placeholder      │
└─────────────────────────────────────────────┘
```

## Changes

### 1. `BackroomSettings.tsx` — Remove two sidebar entries
- Remove `supply-intelligence` and `insights` from the `sections` array and `BackroomSection` type
- Remove their `TabsContent` renderers and imports
- Keep only `overview` which will now contain everything
- Update any `onNavigate('insights')` or `onNavigate('supply-intelligence')` calls to route to `overview` with a sub-tab parameter

### 2. `BackroomDashboardOverview.tsx` — Add sub-tabs
- Add a `SubTabsList` with three triggers: **Command Center**, **Analytics**, **AI Intelligence**
- **Command Center** tab: Keep the existing Control Tower, Procurement, Staff, Inventory Health, and Quick Actions cards (already there)
- **Analytics** tab: Embed the content from `BackroomInsightsSection` (date/location filters, detailed KPI cards, employee table, history chart, brand usage)
- **AI Intelligence** tab: Embed the content from `SupplyIntelligenceDashboard` (AI header + refresh, Supply KPIs, Cost Trends, Digest/Alert settings, Insight Feed, Benchmarking)
- The Setup Banner and top KPI strip remain above the sub-tabs (always visible)
- Accept an optional `initialSubTab` prop so deep-links like `overview:analytics` work

### 3. `BackroomDashboardOverview.tsx` — Update Quick Actions
- Change "Export Report" to navigate to the Analytics sub-tab internally instead of `insights`
- Update "Full Report" link on Staff card to switch to Analytics sub-tab

### 4. Deep-link routing updates
- In `BackroomSettings.tsx`, update `handleNavigate` to support `overview:analytics` and `overview:ai` formats
- Update `categoryToSection` in AlertRow: `profitability`/`waste`/`staff` → stays within the Overview (switches sub-tab)

### 5. Remove Scale icon
- `BackroomInsightsSection` line 144 still uses `Scale` for "Reweighed %" KPI card — replace with `ClipboardCheck`

## Files

| File | Change |
|------|--------|
| `BackroomSettings.tsx` | Remove `supply-intelligence` and `insights` sections, pass sub-tab to Overview |
| `BackroomDashboardOverview.tsx` | Add sub-tabs wrapping existing + imported content, accept `initialSubTab` prop |
| `BackroomInsightsSection.tsx` | Replace `Scale` icon with `ClipboardCheck` |

No database changes. No new dependencies.

