

## Add Tip Attach Rate to the Tips Card

Good call. You already have "Avg Tip Rate" (tips as % of revenue), but you're missing "Tip Attach Rate" — the percentage of appointments where a client left any tip at all. These are two different metrics: one measures generosity amount, the other measures frequency. Both matter for coaching.

### What Exists

- The `useTipsDrilldown` hook already computes `noTipRate` per stylist (% of appointments with $0 tip). The aggregate inverse is the tip attach rate.
- The Tips card currently shows: Total Tips → Avg Tip Rate → Click for breakdown.

### What Changes

**File: `src/components/dashboard/AggregateSalesCard.tsx` (~lines 1149-1162)**

Add a second stat column alongside the existing "Avg Tip Rate" inside the `flex` row at line 1149. The new column shows:

```
Tip Attach Rate
XX%
```

Calculation: We need the aggregate ratio of appointments with tips to total appointments. Two options:

1. **Derive from drilldown data** — sum `appointmentCount` and `noTipRate * appointmentCount / 100` across all stylists in `byTotalTips`. This requires the drilldown hook to be called even when the panel is closed, which it already is (data is fetched on mount).
2. **Inline calculation from the same appointments query** — count appointments with `tip_amount > 0` vs total.

Option 1 is simpler since the data already exists. We'll pull `byTotalTips` from the hook result and compute:

```typescript
const totalAppts = byTotalTips.reduce((s, st) => s + st.appointmentCount, 0);
const tippedAppts = byTotalTips.reduce((s, st) => {
  const noTip = Math.round(st.noTipRate * st.appointmentCount / 100);
  return s + (st.appointmentCount - noTip);
}, 0);
const tipAttachRate = totalAppts > 0 ? (tippedAppts / totalAppts) * 100 : 0;
```

**Layout update** in the `flex` container (line 1149):

Currently one column ("Avg Tip Rate"). Add a second column:

```
┌──────────────┬──────────────┐
│   24.2%      │   72%        │
│  Avg Tip Rate│ Tip Attach   │
└──────────────┴──────────────┘
```

Both use `font-display tabular-nums` for values, `text-xs text-muted-foreground` for labels. Separated by a `border-r border-border/40` divider.

### Scope

~15 lines added in `AggregateSalesCard.tsx`. No new hooks, no new queries. Data is already available from `useTipsDrilldown`.

