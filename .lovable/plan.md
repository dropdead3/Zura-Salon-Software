

## "Take Action" Badge + Growth Playbook for Critical Pipeline

### Problem
When the booking pipeline shows "Critical" (0 upcoming vs 0 trailing), the user sees a red status with no actionable next step. They need a clear "Take Action" CTA that opens a guided playbook connecting them to the marketing hub, promotions, and client acquisition tools.

### Solution

**Two deliverables:**

1. **"Take Action" badge** — a small destructive-styled button badge that appears on pipeline surfaces whenever status is `critical` or `slowing`. Links to a new guided action dialog.

2. **Pipeline Action Guide dialog** — a step-by-step playbook dialog that surfaces contextual recovery actions (run ads, create promotions, activate rebooking campaigns) with direct links to the Marketing tab, Campaign Manager, and future growth tools.

### Surfaces that get the "Take Action" badge

| Surface | File | Current behavior |
|---------|------|-----------------|
| Executive Summary KPI tile | `ExecutiveSummaryCard.tsx` | Shows "Critical" text + "View Pipeline" link |
| New Bookings Card inline bar | `NewBookingsCard.tsx` | Shows "Pipeline: Critical" with dot |
| Booking Pipeline location cards | `BookingPipelineContent.tsx` | Shows "Boost Bookings →" link per location |

### Changes

**1. New component: `src/components/dashboard/PipelineActionGuide.tsx`**

A dialog/sheet containing a guided recovery playbook:
- **Header**: "Grow Your Pipeline" with pipeline status context (e.g., "0 appointments in the next 14 days")
- **Action cards** (3-4 steps, ordered by impact):
  1. **Run a Campaign** — "Launch ads to attract new clients" → links to Marketing tab (`/admin/analytics?tab=marketing`)
  2. **Create a Promotion** — "Offer a limited-time deal to fill gaps" → links to Campaign Budget Manager (opens it directly)
  3. **Activate Rebooking** — "Re-engage past clients who haven't returned" → links to client retention tools
  4. **Boost Online Presence** — "Update your website and social profiles" → links to Website Sections
- Each card: icon, title, one-line description, "Go" button linking to the relevant page
- Uses `useOrgDashboardPath` for org-scoped links

**2. `src/components/dashboard/analytics/ExecutiveSummaryCard.tsx`**
- Add `actionBadge` field to `KpiData` interface (optional `{ label: string; onClick: () => void }`)
- On the Booking Pipeline KPI entry, when `pipeline.status !== 'healthy'`, add `actionBadge: { label: 'Take Action' }`
- Render in `KpiTile` as a small `Button` variant="destructive" size="sm" next to the drill-down link
- Clicking opens `PipelineActionGuide` dialog

**3. `src/components/dashboard/NewBookingsCard.tsx`**
- When `pipeline.status === 'critical' || pipeline.status === 'slowing'`, render a "Take Action" badge button inline after the pipeline status line
- Opens same `PipelineActionGuide` dialog

**4. `src/components/dashboard/analytics/BookingPipelineContent.tsx`**
- Replace the existing "Boost Bookings →" text link with a proper "Take Action" badge button
- Opens `PipelineActionGuide` dialog instead of navigating directly to marketing tab

### Design details

- **Badge style**: `variant="destructive" size="sm"` with `rounded-full px-3 text-xs font-display` — pill-shaped, high-contrast
- **Dialog**: Standard `Dialog` with `DRILLDOWN_DIALOG_CONTENT_CLASS` for consistency
- **Action cards**: `bg-muted/30 rounded-lg border border-border/50 p-4` with hover lift, icon left, description center, arrow-right button right
- **Playbook tone**: Advisory, not pushy. "Here's how to fill your pipeline" — per brand voice guidelines

### Files created
- `src/components/dashboard/PipelineActionGuide.tsx`

### Files modified
- `src/components/dashboard/analytics/ExecutiveSummaryCard.tsx`
- `src/components/dashboard/NewBookingsCard.tsx`
- `src/components/dashboard/analytics/BookingPipelineContent.tsx`

