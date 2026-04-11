

# Zura Capital — UI Architecture, Route Map, and Service Wiring

## Current State

**What exists:**
- `CapitalDashboard` embedded inside SEO Workshop only (no dedicated routes)
- `ZuraCapitalCard` (Command Center pinnable card) — working
- `OwnerCapitalQueue` — working but no filters, opens detail dialog
- `FundingOpportunityDetail` — working as Dialog, no deep-link support
- `FinancedProjectsTracker` — working but compact card only
- All production tables (`capital_funding_opportunities`, `capital_funding_projects`, `capital_surface_state`, etc.) — exist
- Hooks: `useZuraCapital`, `useCapitalProjects`, `useCapitalSurfaceState`, `useCapitalEventLog`, `useCapitalPolicySettings` — exist
- Config, eligibility engine, surface priority engine, provider abstraction — all exist
- **No dedicated routes** — capital is only accessible inside the SEO Workshop tab
- **No sidebar entry** for capital
- **No dedicated pages** for queue, opportunity detail, projects, project detail, or settings

**What the spec requires:**
- Dedicated `/admin/capital` routes (queue, opportunity detail, projects, project detail, settings)
- Sidebar navigation entry under Operations or Data sections
- Full page compositions with headers, filter bars, summary strips, and pagination
- Deep-linkable opportunity and project detail pages (not just dialogs)
- `CapitalSettingsPage` for org-level policy management
- `CapitalProjectDetailPage` with repayment, activation, linked work, timeline sections
- Embedded surface components (Operations Hub, service dashboards, stylist dashboards) — Phase 2

## Build Plan

### 1. Create 5 Dedicated Page Components

**`src/pages/dashboard/admin/CapitalQueue.tsx`**
- Uses `DashboardLayout` + `DashboardPageHeader` with `backTo` pointing to growth-hub
- Composition: summary strip (active opportunities count, active projects, total predicted lift, capital deployed), filters bar (location, service, type, status, risk), the existing `OwnerCapitalQueue` component rewritten as a full-page table with pagination
- Permission: `view_team_overview`

**`src/pages/dashboard/admin/CapitalOpportunityDetail.tsx`**
- Route param `:opportunityId`
- Full-page version of `FundingOpportunityDetail` — not a dialog but a proper page with all spec sections: Hero, Metrics Grid, Provider Block, Net Impact, Reason Block, Execution Plan, Activity Timeline, Actions Bar
- Uses `useZuraCapital` to fetch single opportunity or new `useCapitalOpportunity(id)` hook
- Includes breadcrumb back to queue

**`src/pages/dashboard/admin/CapitalProjects.tsx`**
- Lists all funded projects with the `useCapitalProjects` hook
- Full table: Project, Type, Location, Funded Amount, Revenue Generated, Repayment Progress, ROI, Forecast Status, Activation Status
- Filter by status

**`src/pages/dashboard/admin/CapitalProjectDetail.tsx`**
- Route param `:projectId`
- Uses `useCapitalProject(id)`
- Sections: Hero, Performance Strip, Repayment Panel, Forecast Panel, Activation Panel, Linked Work, Timeline
- Shows variance, ROI, break-even progress prominently

**`src/pages/dashboard/admin/CapitalSettings.tsx`**
- Uses `useCapitalPolicySettings`
- Form for editing thresholds: min ROE, min confidence, max risk, max concurrent projects, max exposure, cooldowns
- Permission: `manage_settings`

### 2. Register Routes in `App.tsx`

Add inside the org dashboard route block:
```
admin/capital — CapitalQueue
admin/capital/opportunities/:opportunityId — CapitalOpportunityDetail
admin/capital/projects — CapitalProjects
admin/capital/projects/:projectId — CapitalProjectDetail
admin/capital/settings — CapitalSettings
```

All wrapped in `ProtectedRoute` with `view_team_overview` (settings uses `manage_settings`).

### 3. Add Sidebar Navigation Entry

Add `'/dashboard/admin/capital'` to the `ops` section in `DEFAULT_LINK_ORDER` in `useSidebarLayout.ts`. Add the corresponding nav item in `SidebarNavContent.tsx` with the `Landmark` icon and label "Zura Capital".

### 4. New Hook: `useCapitalOpportunity(id)`

Single-opportunity fetch from `capital_funding_opportunities` by ID + org scope, with joined event log for timeline.

### 5. Refactor Existing Components

**`OwnerCapitalQueue`** — Add filters bar (location, type, status, risk) using existing filter patterns. Add column for Provider Coverage. Support click-to-navigate to detail page (via `dashPath`) instead of opening dialog.

**`FundingOpportunityDetail`** — Keep dialog version for embedded surfaces (Command Center card click). Create a new `FundingOpportunityDetailPage` component for the full-page route that reuses the same section components but in a page layout.

**`FinancedProjectsTracker`** — Add "View All" footer link to `/admin/capital/projects`. Keep compact version for dashboard embedding.

**`CapitalDashboard`** — Repurpose as the capital queue landing page content, or deprecate in favor of the new `CapitalQueue` page. Remove from SEO Workshop (capital should not be confined there).

### 6. Composable Section Components

Extract reusable section components for both dialog and page contexts:
- `CapitalGrowthMathGrid` — investment, lift range, ROE, break-even
- `CapitalProviderBlock` — provider amount, coverage ratio, fees
- `CapitalNetImpactBlock` — monthly lift, repayment drag, net gain
- `CapitalReasonBlock` — deterministic explanation
- `CapitalStatusBadge` — reusable status badge
- `CapitalMetricTile` — already exists inline, extract to shared component

### 7. Wire into Growth Hub

Add a `HubCard` entry for Zura Capital in `GrowthHub.tsx` linking to `/admin/capital`.

## Files Created
| File | Purpose |
|---|---|
| `src/pages/dashboard/admin/CapitalQueue.tsx` | Capital queue landing page |
| `src/pages/dashboard/admin/CapitalOpportunityDetail.tsx` | Opportunity detail page |
| `src/pages/dashboard/admin/CapitalProjects.tsx` | Funded projects list page |
| `src/pages/dashboard/admin/CapitalProjectDetail.tsx` | Funded project detail page |
| `src/pages/dashboard/admin/CapitalSettings.tsx` | Policy settings page |
| `src/hooks/useCapitalOpportunity.ts` | Single opportunity fetch hook |
| `src/components/dashboard/capital-engine/CapitalQueueFilters.tsx` | Reusable filter bar |
| `src/components/dashboard/capital-engine/CapitalQueueSummaryStrip.tsx` | KPI summary strip |
| `src/components/dashboard/capital-engine/FundedProjectDetailSections.tsx` | Reusable project detail sections |
| `src/components/dashboard/capital-engine/CapitalMetricTile.tsx` | Extracted reusable metric tile |
| `src/components/dashboard/capital-engine/CapitalStatusBadge.tsx` | Reusable status badge |

## Files Modified
| File | Change |
|---|---|
| `src/App.tsx` | Add 5 capital routes + lazy imports |
| `src/hooks/useSidebarLayout.ts` | Add capital to ops section |
| `src/components/dashboard/SidebarNavContent.tsx` | Add capital nav item |
| `src/components/dashboard/capital-engine/OwnerCapitalQueue.tsx` | Add filters, navigate to detail page |
| `src/components/dashboard/capital-engine/FinancedProjectsTracker.tsx` | Add "View All" link |
| `src/pages/dashboard/admin/GrowthHub.tsx` | Add Zura Capital hub card |
| `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` | Remove embedded CapitalDashboard |

## Build Order
1. Extract `CapitalMetricTile` and `CapitalStatusBadge` shared components
2. Create `useCapitalOpportunity` hook
3. Create `CapitalQueueFilters` and `CapitalQueueSummaryStrip`
4. Create all 5 page components
5. Register routes in `App.tsx` with lazy imports
6. Add sidebar entry
7. Add Growth Hub card
8. Update `OwnerCapitalQueue` to navigate to page routes
9. Add "View All" to `FinancedProjectsTracker`
10. Remove capital from SEO Workshop

## Phase Scope
This build covers **Mode 2 (centralized administration)** — dedicated routes, navigation, and full page compositions. **Mode 1 (embedded contextual surfacing)** in Operations Hub, service dashboards, and stylist dashboards remains Phase 2.

