

# Four Trend Intelligence Enhancements

## Overview

Building on the existing `useTrendProjection` hook, `TrendIntelligenceSection` component, and `StylistScorecard`, we'll add: (1) weekly digest email with trend projections, (2) AI-powered personalized coaching scripts, (3) goal-setting mode with reverse-calculated targets, and (4) peer comparison trends.

---

## Enhancement 1: Weekly Digest Email

Surface trend projections in the Weekly Intelligence Brief so stylists get updates without visiting the page.

### Approach

Create a new edge function `stylist-trend-digest` that:
- Queries each stylist's KPIs, computes velocity/projection server-side (mirroring `useTrendProjection` logic)
- Calls Lovable AI to generate a short personalized paragraph summarizing their trajectory
- Sends via `send-transactional-email` with a new `stylist-trend-digest` template

A pg_cron job triggers it weekly (Monday 8 AM). The edge function iterates per-org, per-stylist — but sends one email per stylist (transactional, triggered by the weekly cron event).

### Files

| Action | File |
|--------|------|
| Create | `supabase/functions/stylist-trend-digest/index.ts` |
| Create | `supabase/functions/_shared/transactional-email-templates/stylist-trend-digest.tsx` |
| Edit | `supabase/functions/_shared/transactional-email-templates/registry.ts` |
| DB | pg_cron job for weekly trigger |

**Prerequisite**: Transactional email infrastructure must be scaffolded. If not already present, we'll set it up first.

---

## Enhancement 2: AI-Powered Coaching Scripts

Generate personalized coaching recommendations based on each stylist's specific gaps.

### Approach

New edge function `ai-coaching-script` that accepts a stylist's KPI snapshot (current values, targets, gaps, trajectory) and returns a structured coaching script via Lovable AI (tool calling for structured output). The prompt includes their strong areas, weak areas, and generates:
- A 2-3 sentence coaching summary
- 3 specific action items with scripts (e.g., "Here's a script for requesting walk-in routing")
- Priority ranking by impact

New client-side hook `useAICoaching` and a "Get Coaching Plan" button in `TrendIntelligenceSection`.

### Files

| Action | File |
|--------|------|
| Create | `supabase/functions/ai-coaching-script/index.ts` |
| Create | `src/hooks/useAICoaching.ts` |
| Create | `src/components/dashboard/AICoachingPanel.tsx` |
| Edit | `src/components/dashboard/TrendIntelligenceSection.tsx` (add coaching button + panel) |

---

## Enhancement 3: Goal-Setting Mode

Let stylists set a target date ("I want to level up by June") and reverse-calculate daily targets.

### Approach

Add a date picker to `TrendIntelligenceSection` that enters "goal mode." When a target date is set:
- Calculate remaining calendar days
- Reverse-compute per-KPI daily targets needed: `gap / remainingDays`
- Show adjusted daily targets and feasibility indicator (green = achievable, amber = aggressive, red = extremely aggressive)

This is purely client-side math — no database or edge function needed. Store the target date in localStorage per user+level.

### Files

| Action | File |
|--------|------|
| Create | `src/hooks/useGoalMode.ts` (localStorage persistence + reverse calculations) |
| Edit | `src/components/dashboard/TrendIntelligenceSection.tsx` (date picker + goal mode display) |

---

## Enhancement 4: Peer Comparison Trends

Show not just current peer averages but whether peers are improving faster.

### Approach

Extend `useStylistPeerAverages` to also compute peer velocity (prior vs current window averages), then expose `peerVelocity` per KPI. In the scorecard, add a subtle indicator showing whether the stylist is improving faster or slower than peers.

New interface fields: `priorAvgRevenue`, `priorAvgRetailPct`, etc. — computed from the `startStr → evalStartStr` window that's already fetched.

In the scorecard's KPI table, add a small "vs peers" velocity comparison icon: ▲ if improving faster than peers, ▼ if slower.

### Files

| Action | File |
|--------|------|
| Edit | `src/hooks/useStylistPeerAverages.ts` (add prior-window averages + velocity) |
| Edit | `src/components/dashboard/StylistScorecard.tsx` (velocity comparison indicator) |
| Edit | `src/components/dashboard/TrendIntelligenceSection.tsx` (peer trend context in action cards) |

---

## Implementation Order

1. **Goal-setting mode** — client-only, lowest risk
2. **Peer comparison trends** — extends existing hook, no new infra
3. **AI coaching scripts** — new edge function + UI
4. **Weekly digest email** — requires transactional email infrastructure check

## Summary

| Enhancement | New Files | Edited Files | Edge Functions | DB Changes |
|---|---|---|---|---|
| Weekly Digest | 2 | 1 | 1 + cron | pg_cron job |
| AI Coaching | 3 | 1 | 1 | None |
| Goal-Setting | 1 | 1 | 0 | None |
| Peer Trends | 0 | 3 | 0 | None |

6 new files, 4 edited files, 2 edge functions, 1 cron job.

