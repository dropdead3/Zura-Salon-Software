

## Goal
On the sales card, vertically center the **Monthly Goal** block between the 3 KPI cards above it and the **By Location** section below it, so the empty space (caused by the taller right sidebar) is split evenly above and below the goal — instead of stacking at the bottom.

## Why it looks off today
The left column (`xl:col-span-2`) and right sidebar in the main grid (line 773) live in the same row of a CSS grid. The right sidebar (TopPerformers + RevenueDonutChart + RetailPerformanceAlert + Tips) is taller than the left column. Because the left column's children stack top-down with `mt-6` margins, the Monthly Goal lands directly under the KPI tiles and the rest of the row's height becomes a void at the bottom of the left column — visually orphaning the goal from "By Location" which sits in the next row.

```text
Today (top-aligned, asymmetric void):
┌── KPI ─ KPI ─ KPI ──┐ ┌─ Top Performers ─┐
│ ··· goal ··· ─ ── ─ │ │ ─ Donut + Alert ─│
│                     │ │ ─ Tips           │
│  (big void here)    │ │                  │
└─────────────────────┘ └──────────────────┘
[ By Location ── ── ── ── ── ── ── ── ── ── ]

Target (goal centered in residual space):
┌── KPI ─ KPI ─ KPI ──┐ ┌─ Top Performers ─┐
│  (½ void)           │ │ ─ Donut + Alert ─│
│ ··· goal ··· ─ ── ─ │ │ ─ Tips           │
│  (½ void)           │ │                  │
└─────────────────────┘ └──────────────────┘
[ By Location ── ── ── ── ── ── ── ── ── ── ]
```

## Approach
Make the left column a flex column that distributes residual vertical space around the Monthly Goal block. Two surgical edits in `src/components/dashboard/AggregateSalesCard.tsx`:

1. **Left column wrapper (line 775)** — change from `<div className="xl:col-span-2">` to `<div className="xl:col-span-2 flex flex-col h-full">`. This makes the left column fill the row's height and stack children vertically.

2. **Goal Progress wrapper (line 1462)** — change from `<div className="mt-6">` to `<div className="mt-auto mb-auto pt-6">`. The matched `mt-auto` + `mb-auto` push equal flex space above and below the goal block, vertically centering it within the residual whitespace. `pt-6` preserves the existing visual spacing from the KPIs when the column isn't taller than its content (no centering happens then — graceful fallback).

That's it. No DOM restructure, no changes to drilldown placement (drilldowns sit between the KPI row and the goal — they remain inline before the `mt-auto` wrapper, so when expanded they push the goal down naturally).

## Edge cases
- **Short content (no centering needed)**: when the left column is naturally taller than the right (e.g., a drilldown is expanded), `mt-auto`/`mb-auto` collapse to zero — `pt-6` keeps the original spacing.
- **Mobile / stacked layout (`< xl`)**: grid collapses to single column, `flex flex-col h-full` is harmless, and centering doesn't apply because there's no residual space.
- **Drilldowns expanded between KPIs and goal**: drilldown panels render before the goal block, push it down; auto margins still distribute remaining space.

## Files
- **Modify**: `src/components/dashboard/AggregateSalesCard.tsx` — two className tweaks (lines 775 and 1462)

## Out of scope
- Changing the right sidebar order or composition
- Refactoring the goal progress component itself
- Centering on `< xl` viewports (no tall sidebar exists there)

