

## Analysis: How to Make Zura Insights Higher Utility

### What Already Exists
- 6-dimension enrichment (impact, trend, benchmark, urgency, effort, staff)
- Deterministic priority scoring with weighted formula
- Business Health Summary Strip (5 categories)
- Impact-led card layout with dollar amounts
- Guidance panel ("How to improve") with AI drill-down
- Weekly Lever Brief for leadership
- Feature/integration adoption suggestions
- Suggested tasks and action items

### What's Missing -- Ranked by Salon Owner Utility

**1. Location Comparison (Multi-Location Owners)**
The edge function accepts `locationId` but insights are always org-wide or single-location. Multi-location owners need side-by-side: "Location A rebooking: 58% vs Location B: 42%." The data queries already scope by location -- the AI prompt just never gets cross-location comparison data. Add a second parallel query set for multi-location orgs that fetches summary metrics per location, then include a `LOCATION COMPARISON` block in the data context. This is the single highest-value gap for scaling operators.

**2. Staff Performance Leaderboard Context**
The current `staffMentions` field names individuals but lacks context. The edge function fetches `employee_profiles` but doesn't join staff to their appointment metrics (completions, revenue, rebooking rate per stylist). Adding a per-staff breakdown (top 3, bottom 3 by key metrics) to the data snapshot would let insights say "Sarah: 72% rebook rate vs team avg 48%" instead of just "Sarah M."

**3. Client Retention Cohort Data**
No client-level data is queried. The `clients` or `phorest_clients` table has `last_visit_date`, `total_spend`, `visit_count`. Querying clients at risk of churning (no visit in 60+ days) and new client acquisition counts would unlock the most asked-about salon metric: "How many clients am I losing?" Add a `CLIENT HEALTH` block to the data context with counts of at-risk, lapsed, and new clients.

**4. Week-over-Week Comparison Framing**
The data context includes `thisWeekRevenue` vs `lastWeekRevenue` but the AI doesn't get explicit deltas for appointments, cancellations, no-shows, or retail. Computing and passing explicit WoW deltas for each key metric would make trend insights more precise and reduce AI hallucination.

**5. Day-of-Week Gap Detection**
Salon owners obsess over slow days. The appointment data is already fetched but not aggregated by day-of-week. Adding a simple day-of-week utilization breakdown would let insights flag: "Tuesdays are 34% utilized vs Friday at 89% -- consider Tuesday promotions."

**6. "One Thing to Do Today" -- Top Insight Callout**
The panel shows 5-8 insights in a grid. Salon owners running between clients need ONE clear takeaway at the top -- not a strip, not a grid. A single prominent card above everything: the #1 priority-scored insight, rendered as a direct instruction with the impact amount. This is a UI-only change using the existing sorted data.

### Recommended Build Order (all extend current architecture)

| Priority | Enhancement | Effort | Files |
|----------|------------|--------|-------|
| 1 | "One Thing Today" top callout | Small | `AIInsightsDrawer.tsx` only |
| 2 | Client retention cohort data | Medium | Edge function (add query + context block) |
| 3 | Per-staff metric breakdown | Medium | Edge function (join staff to appointments) |
| 4 | Day-of-week utilization analysis | Small | Edge function (aggregate existing data) |
| 5 | Explicit WoW deltas for all metrics | Small | Edge function (compute + add to context) |
| 6 | Location comparison for multi-location | Medium | Edge function (conditional second query set) |

### Implementation Details

**"One Thing Today"** -- Before the tabs, render the top-scored insight as a standalone prominent card with larger text, the impact amount as the hero element, and the primary CTA. No new data needed.

**Client Retention Cohort** -- Query `phorest_clients` for:
- At-risk: `last_visit_date` between 45-90 days ago, count + avg spend
- Lapsed: `last_visit_date` > 90 days ago, count + total lost revenue estimate
- New (last 30 days): count
Add as `CLIENT RETENTION HEALTH` block in the data context string.

**Per-Staff Breakdown** -- Join `appointments` to `employee_profiles` for the last 30 days, compute per-stylist: completed count, total revenue, rebook rate. Pass top 3 and bottom 3 to AI context as `STAFF PERFORMANCE BREAKDOWN`.

**Day-of-Week Utilization** -- Aggregate `appointments` by `EXTRACT(DOW FROM appointment_date)`, compute avg bookings per day-of-week. Add as `DAY-OF-WEEK PATTERNS` block.

**WoW Deltas** -- Compute explicit deltas for: cancellation rate, no-show rate, rebook rate, retail attachment, avg ticket. Add each as a line in the existing revenue section.

**Location Comparison** -- For orgs with `is_multi_location = true`, run a second aggregation query grouping key metrics by `location_id`. Add as `CROSS-LOCATION COMPARISON` block (only when multiple locations exist).

