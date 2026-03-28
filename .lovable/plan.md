

## Fix Confusing "Tracking below scheduled" Line

### Problem
"Tracking $3,423 below scheduled" compares only **completed appointments' actual POS revenue** vs **those same appointments' original scheduled price**. But the user has no way to know this is scoped to completed-only — it reads as a nonsensical number relative to the other visible metrics ($1,905 actual, $3,825 scheduled, $402 pending).

### Solution
Replace the tracking line with a simple, intuitive **shortfall/surplus** that the user can instantly verify:

**Collected vs What Should Have Been Collected So Far**

- Calculate: `shortfall = completedScheduledRevenue - completedActualRevenue`
- Display (only when resolved appointments exist and delta ≠ 0):
  - If shortfall > 0: "Completed appointments brought in $X less than booked" (destructive color)
  - If surplus: "Completed appointments brought in $X more than booked" (success color)

This makes the scope explicit — it's about **completed appointments specifically**, and tells the operator whether clients are downgrading or upgrading from their booked services.

### Changes in `AggregateSalesCard.tsx` (lines ~880-895)

Replace:
```
Tracking $3,423.00 below scheduled
```

With copy like:
```
↓ Completed appts collected $X less than booked
```
or
```
↑ Completed appts collected $X more than booked
```

The key difference: the word "completed" + "than booked" makes the comparison self-explanatory. No ambiguity about what's being compared.

### File
- `src/components/dashboard/AggregateSalesCard.tsx` — update lines ~880-895

