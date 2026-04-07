

# Surface In-Depth Staff Analytics on 1:1 Meeting Page

## Problem

The Meeting Details page currently shows only: Meeting Notes, Accountability Items, Level Progress card, and Report Builder. Coaches have no visual performance snapshot during 1:1s — they have to navigate away to the Individual Staff Report to see revenue, tip rate, retail attachment, Color Bar compliance, etc.

## Solution

Add a new `MeetingPerformanceSummary` component to the Meeting Details page that provides a comprehensive at-a-glance performance snapshot for the stylist. This reuses the existing `useIndividualStaffReport` hook (which already computes everything needed) and `useStaffComplianceSummary` (which has enhanced waste/overage data).

## Architecture

### 1. New Component: `src/components/coaching/MeetingPerformanceSummary.tsx`

A card-based performance dashboard with four sections, using trailing 30-day data:

**Section A — Revenue & Productivity KPIs (top row of tiles)**
- Total Revenue (vs team avg, with period-over-period change %)
- Average Ticket (vs team avg)
- Appointments Completed
- Revenue per Day

**Section B — Client Experience Metrics (second row)**
- Tip Rate % (tips / revenue × 100) — with team comparison
- Average Tip $ amount
- Rebooking Rate %
- Retention Rate %
- Retail Attachment Rate %
- Experience Composite Score (with status badge: strong/watch/needs-attention)

**Section C — Color Bar Operations (collapsible, only if staff has color appointments)**
- Reweigh Compliance Rate %
- Waste Rate % and Waste Cost $
- Overage Attachment Rate %
- Total Overage Charges $
- Tracked vs Missed sessions
- Coaching callouts (auto-generated if waste > 15% or compliance < 90%)

**Section D — Top Services & Commission (expandable)**
- Top 3 services by revenue
- Current commission tier + total commission earned
- Commission uplift opportunity (from LevelProgress data already available)

Each metric shows: current value, vs team average (when available), and trend indicator (↑/↓/→ vs prior period).

**Data source**: `useIndividualStaffReport(staffUserId, dateFrom, dateTo)` — already computes all of these metrics including team averages and multi-period trends. No new hooks or queries needed.

### 2. Update `src/pages/dashboard/MeetingDetails.tsx`

- Import and render `MeetingPerformanceSummary` in the left column (above Meeting Notes)
- Pass `teamMemberId` and a 30-day trailing date range
- Visible to both coach and team member (both parties should see the same data during the meeting)

### 3. Enhance Report Builder Content Generation

Update `ReportBuilder.tsx` to include the new metrics in the generated check-in report when "Include Performance Summary" is checked:
- Add a new checkbox: "Include Performance Summary"
- When enabled, generate a markdown section with: revenue (vs team avg), tip rate, attachment rate, rebooking rate, experience score
- This supplements the existing Color Bar Performance and Level Progress sections

## Files Changed

| File | Change |
|---|---|
| `src/components/coaching/MeetingPerformanceSummary.tsx` | New — comprehensive performance card using `useIndividualStaffReport` |
| `src/pages/dashboard/MeetingDetails.tsx` | Add MeetingPerformanceSummary to meeting layout |
| `src/components/coaching/ReportBuilder.tsx` | Add "Include Performance Summary" checkbox + report section |

3 files (1 new, 2 modified). No database changes. No new hooks — reuses existing `useIndividualStaffReport` which already computes all required metrics.

## Design Compliance

- All metric tiles use `tokens.kpi.*` for labels/values
- Card follows canonical header pattern with `tokens.card.iconBox` + `MetricInfoTooltip`
- Financial values wrapped in `BlurredAmount`
- Trend indicators use emerald/rose/muted color conventions
- Font rules: `font-display` for KPI labels (uppercase), `font-sans` for values
- No `font-bold` or `font-semibold` — max `font-medium`

