

## Fix: Expected Badge Should Turn Green When Revenue Exceeds Target

### Problem

The "Expected" badge on line 627 always uses `warning` (amber) styling regardless of whether actual revenue has surpassed it. When you've exceeded expected revenue, showing the expected amount in amber sends a contradictory signal — amber implies caution, but the situation is positive.

### Fix

**File: `src/components/dashboard/AggregateSalesCard.tsx`** (line 627)

Use the same `exceededExpected` check (already computed on line 647) to conditionally style the badge:

- **Below target**: Keep current amber/warning styling — `bg-warning/10 text-warning border-warning/30`
- **Exceeded target**: Switch to success styling — `bg-success/10 text-success-foreground border-success/30`

The `exceededExpected` boolean needs to be computed *before* the badge (currently it's computed inside a nested closure on line 647). Move the calculation up to line ~625 scope so both the badge and the progress bar can reference it.

### Scope

~5 lines changed in 1 file. Move one variable declaration up and add a conditional class to the badge.

