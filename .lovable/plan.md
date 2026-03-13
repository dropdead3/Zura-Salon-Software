

# Stylist Mixing Dashboard — Implementation Plan

## Overview

A personal dashboard page for stylists showing their backroom mixing activity: today's formulas, product usage trends, most-used formulas, overage history, and performance metrics. Accessible from the **My Tools** sidebar section.

## Data Sources (all existing — no new tables needed)

| Data | Source |
|------|--------|
| Today's formulas | `mix_sessions` filtered by `mixed_by_staff_id = auth.uid()` + today's date, joined with `mix_bowls` and `mix_bowl_lines` |
| Product usage trends | `mix_bowl_lines` aggregated by product over recent sessions |
| Most-used formulas | `client_formula_history` filtered by `staff_id = auth.uid()`, grouped by formula_data pattern |
| Overage history | `checkout_usage_charges` joined via `mix_session_id` to the stylist's sessions |
| Performance metrics | `staff_backroom_performance` filtered by `staff_id = auth.uid()` |

## New Files

| File | Purpose |
|------|---------|
| `src/hooks/backroom/useStylistMixingDashboard.ts` | Single hook aggregating today's sessions, usage trends, top formulas, overage history for current user |
| `src/pages/dashboard/StylistMixingDashboard.tsx` | Page component with 5 card sections |

## Modified Files

| File | Change |
|------|--------|
| `src/config/dashboardNav.ts` | Add entry to `myToolsNavItems` for stylists |
| `src/App.tsx` | Register route `/dashboard/mixing` |

## Page Layout (5 sections)

1. **Today's Formulas** — Card listing today's mix sessions with client name, service, bowl count, status badge. Links to session detail.
2. **Performance Snapshot** — 4 stat cards: total sessions (period), waste rate, reweigh compliance, avg usage variance. Data from `useStaffBackroomPerformance`.
3. **Product Usage Trends** — Bar chart (recharts) of top 8 products by dispensed weight over last 30 days.
4. **Most-Used Formulas** — Table of top 5 formulas from `client_formula_history`, showing formula components, frequency count, last used date.
5. **Overage History** — Table of recent overage charges: date, service, included qty, actual qty, overage qty, charge amount, status badge (approved/waived/pending).

## Hook: `useStylistMixingDashboard`

Fetches all data in parallel using the current user's ID:
- Today's sessions: `mix_sessions` where `mixed_by_staff_id = userId` and `started_at >= today`
- Performance: reuses `useStaffBackroomPerformance` with user's staff ID
- Usage trends: `mix_bowl_lines` joined through `mix_bowls` → `mix_sessions` for last 30 days
- Top formulas: `client_formula_history` where `staff_id = userId`, ordered by frequency
- Overage charges: `checkout_usage_charges` joined through `mix_sessions` where `mixed_by_staff_id = userId`

## Nav & Route

- **Nav entry** in `myToolsNavItems`: `{ href: '/dashboard/mixing', label: 'My Mixing', icon: Beaker, roles: ['stylist', 'stylist_assistant'] }`
- **Route** in `App.tsx`: standard `ProtectedRoute` wrapping the page

## Build Order

1. Create `useStylistMixingDashboard.ts` hook
2. Create `StylistMixingDashboard.tsx` page with all 5 sections
3. Add nav entry + route registration

