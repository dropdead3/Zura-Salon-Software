## Problem

In simple view on the Command Center, three pinned tiles surface the **same headline number** (e.g. $5.6k) for the active period:

| Tile | Currently shows | Source |
|---|---|---|
| Executive Summary | `salesData.totalRevenue` | useSalesMetrics |
| Sales Overview | `salesData.totalRevenue` (current/expected) | useSalesMetrics |
| Revenue Breakdown | `serviceRevenue / productRevenue` (sums to totalRevenue) | useSalesMetrics |
| Daily Brief | `salesData.totalRevenue` (4th repeat when pinned) | useSalesMetrics |

The user reads the dashboard left-to-right and sees the same $5.6k stamped repeatedly. That violates the doctrine: "high signal, low noise" and "if it does not reduce ambiguity, it doesn't belong." Each surface must answer a *different* question.

## Diagnosis — what each card *should* answer

```text
Executive Summary  → "Am I winning the period vs my goal/last period?"  (delta + pace)
Sales Overview     → "What's the live revenue clock right now?"         (current vs expected, attach)
Revenue Breakdown  → "Where is the revenue coming from?"                 (mix %, not totals)
Daily Brief        → "What happened today operationally?"                (today's bookings/queue, not $)
```

The total dollar amount is Sales Overview's job. The other three should restate it through a *different lens* — or not show it at all.

## Proposed simple-view payloads

### 1. Executive Summary — switch from "total revenue" to "delta vs prior period"
```text
Headline: +12.4%   (or −8.1%)
Subtext:  $5.6k vs $5.0k last 30d · pacing ahead of goal
```
Reuses `salesData.totalRevenue` + a prior-period fetch (same hook, shifted dates) and the existing goal pace icon already wired up in this file. Number is contextual, not duplicated.

### 2. Sales Overview — keep as the canonical revenue clock
No change. This is the one place the raw $5.6k belongs (with current vs expected split for "today").

### 3. Revenue Breakdown — switch from "$X / $Y" to mix percentage + dominant share
```text
Headline: 78% Service
Subtext:  Service $4.4k · Retail $1.2k · Retail mix 22%
```
Same data, different lens. The headline answers "what's my mix?" instead of restating the total.

### 4. Daily Brief — switch from revenue to today's operational pulse
```text
Headline: 14 appts · 2 waiting
Subtext:  $5.6k earned today · 86% capacity
```
Revenue moves to the subtext as supporting context; the headline becomes operational. This breaks the "same number, different label" pattern.

## Secondary cleanup found while auditing

- `CARD_DESCRIPTIONS.executive_summary` ("Total revenue across all services and products") is a verbatim restatement of `sales_overview`. Update tooltip copy to match the new "vs prior period" framing.
- `CARD_DESCRIPTIONS.daily_brief` ("Revenue generated today") will be updated to "Today's appointments, queue, and earned revenue."

## Files to edit

- `src/components/dashboard/PinnedAnalyticsCard.tsx`
  - Add prior-period revenue fetch for `executive_summary` (reuse `useSalesMetrics` with shifted date window via existing `getDateRange`).
  - Rewrite the four `case` blocks (lines ~431, ~442, ~464; Sales Overview untouched).
  - Update `CARD_DESCRIPTIONS` for `executive_summary` and `daily_brief`.

No DB, no new hooks (prior-period uses the same hook with different args), no full-card view changes — full-size analytics tab cards keep their existing detailed render, this only repairs the simple-view bento tiles where the redundancy is visible.

## Out of scope

- Locations Status, Service Mix, Retail Effectiveness, Rebooking, Goal Tracker — already differentiated.
- Full-card (non-simple) views in the Analytics Hub — they already show distinct visualizations.

## Acceptance

On the Command Center in simple view with all four cards pinned, no two tiles display the same dollar amount as their headline. Each tile answers a structurally different question.
