

## Goal
Reframe the retail performance verdict around **attach rate as the primary signal** (not the worst-of between true retail % and attach rate), and rewrite the critical-tier copy to name the root cause directly: stylists aren't making the CTA.

## Why this matters
Attach rate measures stylist behavior at checkout — the CTA itself. True retail % is downstream of attach rate, basket size, and assortment. Conflating the two with worst-of logic obscures the real lever. When retail mix is below 10%, the cause is almost always missing recommendations, not pricing or product mix.

## Changes

### 1. `src/lib/retailPerformance.ts` — primary signal + new copy
**Tier logic shift**: Attach rate becomes the primary tier driver. True retail % only **downgrades** the verdict when it's materially weaker (≥2 tiers below attach), preventing oversell when basket is hollow. Remove symmetric worst-of.

```ts
// Pseudo
const tier = attachTier;
if (TIER_RANK[retailTier] <= TIER_RANK[attachTier] - 2) {
  tier = retailTier; // hollow basket — downgrade
}
```

**Copy rewrite** — name the behavior, not the metric:

| Tier | New copy |
|---|---|
| strong | "Stylists are consistently making the retail recommendation. Protect this routine." |
| healthy | "Stylists are recommending retail. One coaching cycle could push attach rate to top quartile." |
| soft | "Attach rate is slipping. Stylists are skipping the retail recommendation on too many tickets." |
| critical | "Your stylists are likely not selling and need some help. Retail attach is below the threshold where coaching is optional." |

**Sub-10% retail special case**: When `trueRetailPercent < 10` AND attach is also weak, force tier to `critical` and use the explicit copy above. This honors the user's stated rule.

### 2. Optional: tier label adjustment
Current label "Retail Health · Critical" stays — the body copy carries the new framing. No structural change to `RetailPerformanceAlert.tsx` needed.

## Tier thresholds (unchanged but now attach-led)
- Attach: ≥40 strong · ≥30 healthy · ≥15 soft · <15 critical
- True retail % only matters as a downgrade gate (≥2 tier gap)

## Edge cases
- Materiality gate ($500 total) unchanged — silence still valid.
- Missing attach rate → still returns null (attach is now mandatory anchor).
- True retail % missing → falls back to attach-only tier (currently returns null; relax to allow attach-only verdict).

## Out of scope
- Per-stylist attach rate breakdown (Phase 2 advisory)
- Coaching script CTA inside the alert
- Threshold customization UI

## Files
- **Modify**: `src/lib/retailPerformance.ts` — attach-led tier logic, sub-10% retail override, new copy

