

# Trend Intelligence — Gaps, Bugs & Enhancements Audit

## Bugs

### Bug 1: `useGoalMode` revenue daily target ignores goal date
In `useGoalMode.ts` line 129, revenue `dailyNeeded` is hardcoded to `p.gap / 30` regardless of `daysRemaining`. If someone sets a 14-day goal, they still see the 30-day figure. Should be `p.gap / daysRemaining` for consistency with the goal timeline (revenue gap is a monthly average gap, but if you want to close it faster, the daily intensity should reflect the compressed timeline).

**Fix:** Change to `dailyNeeded = p.gap / daysRemaining` for revenue in goal mode, or at minimum `p.gap / Math.min(30, daysRemaining)`.

### Bug 2: `useStylistPeerAverages` missing `priorTotalRetention` in velocity
Line 295: `retentionVelocity` is hardcoded to `0` with a comment "requires more complex calculation." This means the peer velocity comparison indicator for retention will never show ▲/▼ — it's dead UI.

**Fix:** Compute prior-window retention the same way current-window retention is computed, and calculate the velocity.

### Bug 3: `stylist-trend-digest` — no pagination on sales/appts queries
Lines 81-95: Both queries fetch without pagination. With the 1000-row default limit, stylists with high transaction volumes over 180 days (2× 90-day window) will silently get truncated data, producing incorrect KPI calculations.

**Fix:** Add the same pagination loop pattern used in `useStylistPeerAverages.ts`.

### Bug 4: `ai-coaching-script` — no auth check
The edge function doesn't verify the caller is authenticated or authorized. Any anonymous request with valid KPI data can invoke AI credits.

**Fix:** Add `Authorization` header validation using Supabase `getUser()`.

### Bug 5: `TrendIntelligenceSection` hides entirely when `hasNextLevel` is false
Line 201: `if (!hasNextLevel || projection.projections.length === 0) return null;` — Top-level stylists who need to maintain metrics get no trend intelligence at all. The retention risk nudge and maintenance coaching are invisible to them.

**Fix:** Show a maintenance-focused view for top-level stylists when there are retention risks or declining metrics.

## Gaps

### Gap 1: Weekly digest pg_cron job never created
The plan calls for a pg_cron job to trigger `stylist-trend-digest` weekly. No migration was created. The edge function exists but has no automated trigger.

**Fix:** Create a migration adding: `SELECT cron.schedule('weekly-trend-digest', '0 8 * * 1', $$SELECT net.http_post(...)$$);`

### Gap 2: Digest email missing `avg_ticket`, `rev_per_hour`, `new_clients` KPIs
`stylist-trend-digest` only computes 4 KPIs (revenue, retail%, rebooking, utilization) but the level criteria can include avg_ticket, rev_per_hour, retention_rate, and new_clients. These are silently omitted from the email.

**Fix:** Extend `computeWindowKpis` and the kpiMap builder to include all criteria fields.

### Gap 3: No loading/error state in `TrendIntelligenceSection`
If `useTrendProjection` returns empty projections (e.g. data still loading upstream), the section renders nothing. No skeleton or feedback.

### Gap 4: AI coaching has no rate-limiting or caching
Each click of "AI Coaching" fires a new edge function call. No debounce, no localStorage cache of the last result, no cooldown period. Users can burn through AI credits rapidly.

**Fix:** Cache coaching results in state/localStorage with a TTL (e.g., 24h). Add a cooldown button state.

### Gap 5: Peer velocity threshold too low
In `StylistScorecard.tsx` line 392, `Math.abs(diff) < 0.01` is the threshold. For revenue velocity (which is in $/day), 0.01 is essentially zero — every peer comparison will show an arrow. For percentage metrics, 0.01 per day is also very sensitive. Should be metric-aware.

## Enhancements

### Enhancement 1: Add "share with manager" action on AI coaching
Let stylists share their coaching plan with their manager via a simple in-app notification or email, fostering accountability.

### Enhancement 2: Historical trend sparkline
Add a tiny sparkline in the Pace column showing the last 4 data points of each KPI, giving visual momentum context beyond just "improving/declining/flat."

### Enhancement 3: Goal mode should show a countdown + milestone markers
When goal mode is active, show milestone markers (25%, 50%, 75%) on each KPI's progress bar relative to the goal date, so stylists can track interim progress.

### Enhancement 4: Digest email should include a deep link
The email says "View your full scorecard" but has no link. Add a deep link to the My Level Progress page.

### Enhancement 5: Coaching panel should persist across page navigation
Currently coaching is in React state — navigating away and back loses it. Store in a lightweight cache (React Query or localStorage).

## Implementation Priority

| # | Item | Type | Risk | Effort |
|---|------|------|------|--------|
| 1 | Bug 4: Auth check on AI coaching edge function | Bug | **High** (security) | Small |
| 2 | Bug 3: Pagination in digest queries | Bug | Medium | Small |
| 3 | Gap 1: Create pg_cron migration | Gap | Medium | Small |
| 4 | Bug 1: Goal mode revenue calc | Bug | Medium | Trivial |
| 5 | Bug 5: Top-level stylist visibility | Bug | Medium | Small |
| 6 | Gap 4: AI coaching rate-limit/cache | Gap | Medium | Small |
| 7 | Gap 2: Missing KPIs in digest | Gap | Low | Small |
| 8 | Bug 2: Retention velocity | Bug | Low | Medium |
| 9 | Gap 5: Metric-aware velocity threshold | Gap | Low | Small |
| 10 | Enhancement 4: Digest deep link | Enhancement | Low | Trivial |
| 11 | Enhancement 5: Coaching persistence | Enhancement | Low | Small |
| 12 | Enhancement 1-3 | Enhancement | Low | Medium |

**Recommendation:** Start with items 1-6 as a single pass — they're all small fixes that materially improve correctness and security. Items 7-12 can follow as a polish pass.

## Files Changed

| File | Changes |
|---|---|
| `supabase/functions/ai-coaching-script/index.ts` | Add auth check |
| `supabase/functions/stylist-trend-digest/index.ts` | Add pagination, missing KPIs, deep link |
| `src/hooks/useGoalMode.ts` | Fix revenue daily calc |
| `src/hooks/useStylistPeerAverages.ts` | Compute retention velocity |
| `src/hooks/useAICoaching.ts` | Add localStorage cache + cooldown |
| `src/components/dashboard/StylistScorecard.tsx` | Metric-aware velocity threshold |
| `src/components/dashboard/TrendIntelligenceSection.tsx` | Show maintenance view for top-level stylists |
| DB migration | pg_cron job for weekly digest |

