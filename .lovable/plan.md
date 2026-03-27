

## Replace AI-Generated Preview Images with Code-Rendered Previews

### Problem
The current preview images are AI-generated JPGs that don't match the actual card designs, typography, color scheme, or data layout used in the real analytics cards.

### Approach
Create lightweight, self-contained preview components for each card type that render with hardcoded faux data — matching the real card's visual structure (headers, charts, metrics, badges) but without any hooks or data fetching. These replace the `<img>` tag in the HoverCard.

### Changes

**1. Create `src/components/dashboard/previews/AnalyticsCardPreview.tsx`**
- A router component that takes a `cardId` and renders the appropriate mini preview
- Each card preview is a small function returning JSX with hardcoded data
- Uses the same design tokens, typography (Termina headers, Aeonik body), and layout patterns as the real cards
- Includes simplified versions of: metric values, mini bar/donut charts (via simple divs/SVGs), stat rows, badges
- All monetary values shown as realistic sample numbers (not blurred — these are previews)
- Scaled down to fit ~360px width naturally

**2. Preview components for all 12 pinnable cards:**
- `SalesOverviewPreview` — Revenue total, service/retail split bars, comparison badge
- `RevenueBreakdownPreview` — Simple donut chart (CSS), category legend
- `TopPerformersPreview` — Ranked list with revenue bars
- `WeekAheadForecastPreview` — Mini line chart area, daily forecast row
- `GoalTrackerPreview` — Progress ring, pace status badge, daily run rate
- `NewBookingsPreview` — Booking count, trend arrow, time distribution
- `ClientFunnelPreview` — New/returning split, funnel visualization
- `OperationsStatsPreview` — Utilization gauge, queue stats
- `CapacityUtilizationPreview` — Bar chart by provider
- `StylistWorkloadPreview` — Workload distribution bars
- `StaffingTrendsPreview` — Mini trend line, headcount stats
- `HiringCapacityPreview` — Open positions, capacity meter

Each preview is ~30-50 lines of JSX using existing UI primitives (Card, Badge, Progress) and design tokens.

**3. Update `SortablePinnedCardItem.tsx`**
- Replace `previewSrc?: string` prop with `cardId: string` (already has `id`)
- Replace the `<img>` tag inside HoverCard with `<AnalyticsCardPreview cardId={cardId} />`
- Remove the `previewSrc` prop entirely

**4. Update `DashboardCustomizeMenu.tsx`**
- Remove `ANALYTICS_CARD_PREVIEWS` import and `previewSrc` prop passing
- Pass just the card ID (already passed as `id`)

**5. Clean up**
- Delete `src/components/dashboard/analyticsCardPreviews.ts`
- Delete all 12 JPG files from `src/assets/analytics-previews/`

### Technical Details
- Preview components use zero hooks — pure JSX with hardcoded data
- Charts are simplified: CSS gradient bars, SVG circles for donuts, simple div-based bar charts
- Design tokens imported for consistent typography and spacing
- Each preview wrapped in a `Card` with the canonical header layout (icon + Termina title)
- Total new code ~600-800 lines in a single file, keeping it consolidated

