

# Fix: Recommended Weights Producing Negative Values and Not Totaling 100%

## Problem

Two bugs in the "Recommended" preset logic:

1. **Negative weights**: `rev_per_hour_weight` has a recommended value of `0`. When it's enabled and happens to be last in the active list, it gets `100 - assigned` — but `assigned` can already exceed 100 due to rounding, producing a negative value.

2. **Total exceeds 100%**: `Math.round` on each metric can round up cumulatively, so `assigned` overshoots 100 before the last metric is reached.

## Fix

### File: `src/components/dashboard/settings/GraduationWizard.tsx`

**1. Give zero-weight metrics a minimum fallback** (~line 141-150)

Change `rev_per_hour_weight: 0` to a small positive value (e.g., `3`) so it gets a fair share when enabled. Adjust other values so the defined totals still make sense as ratios:

```ts
const RECOMMENDED_WEIGHTS: Record<string, number> = {
  revenue_weight: 40,
  retail_weight: 10,
  rebooking_weight: 15,
  avg_ticket_weight: 10,
  retention_rate_weight: 15,
  new_clients_weight: 5,
  utilization_weight: 5,
  rev_per_hour_weight: 5,
};
```

**2. Fix rounding to guarantee 100% total** (~lines 992-1003)

Replace `Math.round` with `Math.floor` for all non-last metrics, ensuring the running total never exceeds 100. The last metric absorbs the remainder cleanly:

```ts
let assigned = 0;
active.forEach((c, i) => {
  const raw = RECOMMENDED_WEIGHTS[c.weightKey] || 5; // fallback to 5 if missing
  if (i === active.length - 1) {
    (next as any)[c.weightKey] = 100 - assigned;
  } else {
    const scaled = Math.floor((raw / totalRaw) * 100);
    (next as any)[c.weightKey] = scaled;
    assigned += scaled;
  }
});
```

This ensures weights are always non-negative and always sum to exactly 100%.

## Scope
- Single file: `GraduationWizard.tsx`
- ~4 lines changed
- No database changes

