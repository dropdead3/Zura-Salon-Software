

# Make Budget KPI Tile Clickable with Deep Link

## Problem
The Budget KPI tile shows "Not set" when no budget exists but doesn't link anywhere. Whether set or not, clicking it should navigate to the budget configuration section.

## Changes

### `BackroomDashboardOverview.tsx`

1. **Pass `onNavigate`** to `BudgetKpiTile` — the existing prop that handles `section:tab` deep-linking
2. **Wrap the tile in a clickable element** — make the entire card a button that calls `onNavigate('inventory:reorder')` (where the Procurement Budget settings live)
3. **Add visual affordance** — cursor-pointer, hover state, and a subtle link hint (e.g., "Set budget →" or "Adjust →" subtitle text) so it's clear the tile is interactive

### Implementation detail

```tsx
function BudgetKpiTile({ ..., onNavigate }: { ...; onNavigate: (s: string) => void }) {
  return (
    <button onClick={() => onNavigate('inventory:reorder')} className={cn(tokens.kpi.tile, 'relative cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all text-left')}>
      {/* existing content */}
      {monthlyBudget > 0 ? (
        <>
          <span className={...}>{pct}%</span>
          <Progress ... />
        </>
      ) : (
        <span className={...}>Not set</span>
      )}
      <span className="text-[10px] text-muted-foreground mt-1">
        {monthlyBudget > 0 ? 'Adjust →' : 'Set budget →'}
      </span>
    </button>
  );
}
```

At the call site, pass the existing `onNavigate` prop through.

### Files to edit
1. `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx` — update `BudgetKpiTile` component and its invocation

