

## Your Savings — Gaps & Enhancements

### Issues Found

**1. No subscription cost comparison on the Savings page**
The `BackroomROICard` on the subscription page shows savings *vs* subscription cost with a net benefit bar. The new Savings page shows total savings but never mentions what the subscription costs — so owners can't see the ROI ratio. The whole point is "you pay $X, you save $Y."

**2. All three category cards show $0 when data is zero — no differentiation**
If waste savings is $0 (owner already below 12% baseline) the card just shows "$0.00" with no context. Should show a positive message like "Your waste is already below industry average — great job!" instead of looking broken.

**3. No period selector**
Hardcoded to 30 days with no way to toggle. Adding a simple 7d / 30d / 90d toggle would let owners see momentum and longer-term value.

**4. Duplicate logic with `useBackroomROI`**
`useBackroomROI` and `useBackroomSavings` calculate the same waste reduction math independently. The ROI card on the subscription page uses one, the savings page uses the other. If the formula changes, they'll drift.

**5. Categories with $0 still render — clutters the view**
If supply cost recovery is $0 (no overage charges yet), the card still renders and looks like a failure. Should either hide or show an "activate this" prompt.

**6. No cumulative / all-time view**
Owners who've been subscribed for months want to see "You've saved $X total since joining" — not just the last 30 days.

### Proposed Changes

| File | Change |
|------|--------|
| `useBackroomSavings.ts` | Accept a `days` param (7/30/90); add `subscriptionCost` and `netBenefit` to the return; add `allTimeSavings` query (no date filter) |
| `BackroomSavingsSection.tsx` | Add period toggle (7d/30d/90d); add subscription cost comparison bar (reuse the pattern from `BackroomROICard`); show contextual empty states per category ($0 waste = congratulatory, $0 supply = "enable overage charges"); add cumulative savings banner |
| `BackroomROICard.tsx` | Refactor to consume `useBackroomSavings` instead of `useBackroomROI`, eliminating duplicate logic |

### Result
The Savings page becomes the single source of truth for backroom value — with period flexibility, subscription cost comparison, smart empty states, and cumulative totals that make the ROI undeniable over time.

