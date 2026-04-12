

# Operator Mode Components Not Visible — Diagnosis & Fix

## Why You Don't See Them

All three Operator Mode components have **data guards that return `null`** when conditions aren't met:

| Component | Returns null when... |
|---|---|
| `OperatorTopLever` | No capital opportunities AND no briefing focus title |
| `MoneyLeftOnTable` | No expired tasks with `missed_revenue_cents`, no overdue tasks with revenue impact, no unacted capital opportunities |
| `TeamGrowthContribution` | No completed tasks this month with `source IN ('zura', 'seo_engine')` and `estimated_revenue_impact_cents > 0` |

Your environment has no data matching these conditions, so every component silently disappears.

## Fix

Add **empty/placeholder states** to each component so they always render for leadership, even without data. This ensures the Operator Mode sections are visible and educate users about what will appear once data flows.

### 1. `OperatorTopLever` — Show placeholder when no opportunity
Instead of returning `null`, show a subtle card: "No growth opportunities detected yet — Zura is analyzing your business" with a muted primary accent.

### 2. `MoneyLeftOnTable` — Show zero-state
When `totalCents === 0`, show: "No revenue leakage detected — you're capturing all opportunities" with a success accent (green).

### 3. `TeamGrowthContribution` — Show placeholder
When no members, show: "Complete Zura tasks to see team growth attribution here" with empty-state styling.

## Files

| File | Action |
|---|---|
| `src/components/dashboard/operator/OperatorTopLever.tsx` | Replace `return null` with placeholder card |
| `src/components/dashboard/operator/MoneyLeftOnTable.tsx` | Replace `return null` with zero-state |
| `src/components/dashboard/operator/TeamGrowthContribution.tsx` | Replace `return null` with empty state |

3 files, no database changes. Each component gets ~10 lines added for its empty state.

