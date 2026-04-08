

# Trend Intelligence — Pass 2 Audit (Post-Fix)

## Status of Prior Audit Items

| # | Item | Status |
|---|------|--------|
| 1 | Auth check on AI coaching | Fixed ✓ |
| 2 | Pagination in digest | Fixed ✓ |
| 3 | pg_cron migration | Created ✓ |
| 4 | Goal mode revenue calc | Fixed ✓ |
| 5 | Top-level stylist visibility | Fixed ✓ |
| 6 | AI coaching cache/cooldown | Fixed ✓ |
| 7 | Missing KPIs in digest | Fixed ✓ |
| 8 | Retention velocity | Fixed ✓ |
| 9 | Metric-aware velocity threshold | Fixed ✓ |
| 10 | Digest deep link | Fixed ✓ |

All 10 prior items resolved. Below are newly identified issues.

---

## Bugs

### Bug 1: `useAICoaching` cache key uses email, not user ID
`getCacheKey` uses `stylistName` (which is `user?.email`) and `currentLevel`. Two problems:
- Email can change; user ID is stable
- If two stylists share the same browser (e.g., shared salon kiosk), coaching results from one stylist could be served to another

**Fix:** Pass `userId` into `generateCoaching` and use it as the cache key instead of `stylistName`.

### Bug 2: `useAICoaching` cooldown resets on component remount
`lastRequestTime` is stored in React state, not `useRef`. When `MyGraduation` remounts (navigation), the cooldown resets to 0, bypassing the 60s guard. Meanwhile the cache works, so this is low-severity, but still a gap.

**Fix:** Use `useRef` for `lastRequestTime` instead of `useState`.

### Bug 3: `TrendIntelligenceSection` renders IIFE in JSX
Lines 430-464 use `{(() => { ... })()}` pattern to render the "All Metrics" section. This creates a new function every render. Minor perf issue but also poor readability.

**Fix:** Extract to a local variable above the return statement.

### Bug 4: `useTrendProjection` velocity uses `priorCurrent` but never validates it
Line 182: `(cp.current - cp.priorCurrent) / evalDays`. If `priorCurrent` is `undefined` or `NaN` (e.g., no prior data), velocity becomes `NaN`, which propagates to `daysToTarget` and daily targets.

**Fix:** Default `priorCurrent` to `current` when undefined/NaN (resulting in 0 velocity = flat trajectory).

### Bug 5: `stylist-trend-digest` retention calculation is skewed for prior window
Lines 319-327: Prior-window retention looks at appointments *before* `startStr`, but `startStr` for the current window is `evalStartStr`, and for the prior window call it's `priorStartStr`. The function `computeWindowKpis` looks at `appts` where `appointment_date < startStr` for "prior clients," but when computing the prior window's retention, this would look at appointments before the prior window — a *third* window that was never fetched.

**Fix:** Add a comment acknowledging this limitation and set prior retention to 0 (matching the client-side behavior), or skip retention from the digest velocity calculation.

---

## Gaps

### Gap 1: No input validation on `ai-coaching-script` body
The edge function destructures `req.json()` without validating shape. Malformed payloads could crash the function or produce garbage AI prompts.

**Fix:** Add Zod validation for `stylistName` (string), `currentLevel` (string), `nextLevel` (string|null), `kpiSnapshot` (array of objects with required fields).

### Gap 2: Goal mode doesn't invalidate coaching cache
When a stylist sets a goal date, their daily targets change — but the AI coaching cache (keyed by name + level) still returns the old coaching plan that doesn't account for the goal timeline. The two features are disconnected.

**Fix:** Include `goalMode.isActive` and `daysRemaining` in the coaching request body and cache key so coaching reflects the goal timeline.

### Gap 3: `TrendIntelligenceSection` goal mode hidden for top-level stylists
Line 260-303: Goal mode UI only renders when `goalMode` is provided, but top-level stylists have no next level. The goal mode hook still works (it's just localStorage + math), but conceptually there's nothing to "goal toward" for top-level. This is correct behavior but should be explicitly documented.

**Status:** Not a bug — just noting for clarity. No fix needed.

### Gap 4: Digest email skips top-level stylists entirely
Line 98: `if (!nextLevel) continue;` — Top-level stylists never receive digest emails, even if their metrics are declining. They should get a "maintenance digest" when metrics trend down.

**Fix:** For top-level stylists, send a maintenance-focused digest when any metric is declining (similar to the UI maintenance view).

---

## Enhancements

### Enhancement 1: Coaching should show which goal timeline it was generated for
When coaching is cached and goal mode is toggled, the panel should display "Generated without goal mode" or "Generated for 45-day goal" so stylists know the context.

### Enhancement 2: Add "Refresh" button to coaching panel
Currently the only way to get fresh coaching is to dismiss and re-request, which hits the 24h cache. Add a "Refresh" button that bypasses cache (with cooldown still enforced).

### Enhancement 3: Digest email should respect notification preferences
Currently sends to all stylists unconditionally. Should check if the stylist has opted out of digest emails (if a notification preferences system exists).

---

## Implementation Priority

| # | Item | Type | Risk | Effort |
|---|------|------|------|--------|
| 1 | Bug 4: NaN velocity guard | Bug | Medium | Trivial |
| 2 | Gap 1: Zod validation on edge function | Gap | Medium | Small |
| 3 | Bug 1: Cache key uses email not userId | Bug | Low | Trivial |
| 4 | Bug 2: Cooldown uses state not ref | Bug | Low | Trivial |
| 5 | Gap 2: Goal mode + coaching cache alignment | Gap | Low | Small |
| 6 | Gap 4: Digest for top-level stylists | Gap | Low | Small |
| 7 | Bug 5: Prior retention in digest | Bug | Low | Small |
| 8 | Bug 3: IIFE in JSX | Bug | Low | Trivial |
| 9 | Enhancement 2: Coaching refresh button | Enhancement | Low | Trivial |

## Files Changed

| File | Changes |
|---|---|
| `src/hooks/useTrendProjection.ts` | Guard against NaN `priorCurrent` |
| `src/hooks/useAICoaching.ts` | Cache key by userId, `useRef` for cooldown, refresh support |
| `src/pages/dashboard/MyGraduation.tsx` | Pass userId to coaching |
| `src/components/dashboard/TrendIntelligenceSection.tsx` | Remove IIFE, add coaching context label |
| `src/components/dashboard/AICoachingPanel.tsx` | Add refresh button |
| `supabase/functions/ai-coaching-script/index.ts` | Add Zod input validation |
| `supabase/functions/stylist-trend-digest/index.ts` | Handle top-level stylists, fix prior retention |

7 files, all small changes. No database migrations needed.

