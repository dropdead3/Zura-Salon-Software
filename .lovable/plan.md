

# SEO Workshop + Zura Capital — Comprehensive Audit (10 Passes)

## Pass Summary

TypeScript build: **CLEAN** — no compilation errors.

---

## BUGS AND GAPS FOUND

### BUG 1: `FundThisDialog.tsx` Is Orphaned but Still Uses Legacy Types (P1)

`FundThisDialog.tsx` imports `QueuedOpportunity` from `capital-engine.ts` and `computePostFinancingCashFlow` from `financing-engine.ts` (dollars, not cents). **No file imports it** — it was superseded by `CapitalFundingConfirmModal.tsx` but never deleted.

**Fix:** Delete `src/components/dashboard/capital-engine/FundThisDialog.tsx`.

---

### BUG 2: `FinancingEligibilityBadge.tsx` Is Orphaned and Uses Stale Thresholds (P1)

`FinancingEligibilityBadge.tsx` imports `isFinancingEligible` from `financing-engine.ts`, which uses `FINANCING_THRESHOLDS.minROE: 1.5` — not the canonical `1.8`. **No file imports it.**

**Fix:** Delete `src/components/dashboard/capital-engine/FinancingEligibilityBadge.tsx`.

---

### BUG 3: `ExpansionSimulator.tsx` Is Orphaned (P2)

Uses legacy `QueuedOpportunity` type and `simulateScenario` from old engine. **No file imports it.**

**Fix:** Delete `src/components/dashboard/capital-engine/ExpansionSimulator.tsx`.

---

### BUG 4: `SPICard.tsx` Is Orphaned (P2)

**No file imports it.**

**Fix:** Delete `src/components/dashboard/capital-engine/SPICard.tsx`.

---

### BUG 5: `FINANCING_THRESHOLDS` Conflict with Canonical Policy (P1)

`financing-config.ts` defines `FINANCING_THRESHOLDS` with `minROE: 1.5`, while canonical policy uses `1.8`. `financing-engine.ts` uses these old thresholds via `isFinancingEligible()`. Since `FinancingEligibilityBadge` (sole consumer) is orphaned, and the production path uses `calculateInternalEligibility`, the legacy `FINANCING_THRESHOLDS` and `isFinancingEligible()` are dead code that could mislead future development.

**Fix:** Either align `FINANCING_THRESHOLDS.minROE` to `1.8` to match canonical, or add a deprecation comment. Since no production consumer uses `isFinancingEligible`, safest to add `@deprecated` and a note pointing to canonical.

---

### BUG 6: `getVarianceLabel` in `financing-config.ts` Conflicts with Canonical (P2)

`getVarianceLabel()` uses symmetric thresholds (±10%, ±25%) and returns 3 statuses (`on_track`, `watch`, `at_risk`). Canonical `calculateForecastStatus()` uses asymmetric thresholds (+15%/-10%/-25%) and returns 5 statuses (`above_forecast`, `on_track`, `below_forecast`, `at_risk`, `early_tracking`). No production code imports `getVarianceLabel`, but it's still exported.

**Fix:** Add `@deprecated` comment pointing to `calculateForecastStatus`.

---

### GAP 7: SEO Revenue Values Missing `BlurredAmount` (P1)

`SEOPredictedLiftCard.tsx` displays revenue values (`currentRevenue`, `revenueLift.low/expected/high`) without `BlurredAmount`. The card also defines its own local `formatCurrency` function instead of importing from `@/lib/format`.

`SEOGlobalGrowthDashboard.tsx` and `SEOLocationPriorityCard.tsx` use `useFormatCurrency` hook but still do not wrap outputs in `BlurredAmount`.

`SEOEngineDashboard.tsx` shows "Revenue Attributed" without `BlurredAmount`.

**Fix:** Wrap all monetary values in `BlurredAmount` across these 4 SEO files. Replace local `formatCurrency` in `SEOPredictedLiftCard.tsx` with the standard import.

---

### GAP 8: Legacy `capital-engine.ts` Functions Are Partially Redundant (P2)

`capital-engine.ts` exports `computeSPI`, `computeRisk`, `computeROE`, `simulateScenario`, `rankOpportunities`, and `QueuedOpportunity`. Of these:
- `computeROE` computes ROE differently than canonical `calculateRoeRatio` (uses confidence multipliers for break-even adjustment, returns dollars not cents)
- `computeRisk` uses 0-1 inputs and different thresholds than canonical `calculateRiskScore` (0-100 inputs)
- `QueuedOpportunity` is a legacy type only used by orphaned components
- `rankOpportunities` just sorts by ROE — no longer the production ranking logic

These are still exported from `index.ts` and could confuse future development.

**Fix:** Add `@deprecated` comments to all exports in `capital-engine.ts`, noting that canonical versions exist in `capital-formulas.ts`. Keep the functions for any remaining consumers (e.g., `SPICard.tsx` — but that's being deleted).

---

### GAP 9: `financing-engine.ts` `computePostFinancingCashFlow` Uses Dollars, Not Cents (P2)

The canonical system works entirely in cents. `computePostFinancingCashFlow` takes dollar amounts and returns dollar amounts. Only consumer is the orphaned `FundThisDialog.tsx`.

**Fix:** Since the only consumer is being deleted, add `@deprecated` comment. Canonical equivalents are `calculateMonthlyLiftCents` and `calculateNetMonthlyGainCents`.

---

### GAP 10: SEO Engine Dashboard Revenue Card Missing Privacy (P1)

`SEOEngineDashboard.tsx` line 162 displays `$${(totalAttributedRevenue / 1000).toFixed(1)}k` without `BlurredAmount`.

**Fix:** Wrap in `BlurredAmount`.

---

## WHAT IS HEALTHY (No Action Required)

- **Formulas pack** (`capital-formulas.ts` + `capital-formulas-config.ts`): All 22 functions present, tested, deterministic ✓
- **Eligibility engine**: `calculateInternalEligibility` is canonical, wired to org policy ✓  
- **Surface priority engine**: Delegates to canonical `calculateSurfacePriority` ✓
- **Edge function**: Thresholds aligned with canonical (ROE 1.8, confidence 70, etc.) ✓
- **Exposure tracking**: Populates from funded projects via join ✓
- **Behavioral penalties**: Dismissals, declines, cooldowns all hydrated from DB ✓
- **`CapitalFundingConfirmModal`**: Uses canonical types + formulas + BlurredAmount ✓
- **Capital pages** (Queue, OpportunityDetail, ProjectDetail, Projects): All use BlurredAmount ✓
- **Command Center card** (`ZuraCapitalCard`): BlurredAmount applied ✓
- **Embedded components** (`OwnerCapitalQueue`, `FinancedProjectsTracker`, `CapitalQueueSummaryStrip`, `CapitalRecyclingCard`): BlurredAmount applied ✓
- **SEO Engine Dashboard**: Task/campaign/health layers operational ✓
- **SEO Task Detail**: Proof upload, transition, impact tracking functional ✓
- **SEO Domination/Industry/Growth**: All operational ✓
- **SEO autonomy + growth reports**: Hooks and UI functional ✓
- **State machines**: Both capital and SEO state machines consistent ✓
- **Config exports**: Clean, no circular dependencies ✓
- **TypeScript build**: 0 errors ✓

---

## BUILD ORDER

1. Delete 4 orphaned capital components: `FundThisDialog.tsx`, `FinancingEligibilityBadge.tsx`, `ExpansionSimulator.tsx`, `SPICard.tsx`
2. Add `BlurredAmount` to SEO revenue surfaces: `SEOPredictedLiftCard.tsx`, `SEOGlobalGrowthDashboard.tsx`, `SEOLocationPriorityCard.tsx`, `SEOEngineDashboard.tsx`
3. Add `@deprecated` comments to legacy functions in `financing-config.ts`, `financing-engine.ts`, `capital-engine.ts`
4. TypeScript build check

## FILES MODIFIED

| File | Change |
|---|---|
| `src/components/dashboard/capital-engine/FundThisDialog.tsx` | DELETE |
| `src/components/dashboard/capital-engine/FinancingEligibilityBadge.tsx` | DELETE |
| `src/components/dashboard/capital-engine/ExpansionSimulator.tsx` | DELETE |
| `src/components/dashboard/capital-engine/SPICard.tsx` | DELETE |
| `src/components/dashboard/seo-workshop/SEOPredictedLiftCard.tsx` | Add BlurredAmount + fix formatCurrency import |
| `src/components/dashboard/seo-workshop/SEOGlobalGrowthDashboard.tsx` | Add BlurredAmount wrapping |
| `src/components/dashboard/seo-workshop/SEOLocationPriorityCard.tsx` | Add BlurredAmount wrapping |
| `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` | Add BlurredAmount to revenue card |
| `src/config/capital-engine/financing-config.ts` | Add @deprecated to `getVarianceLabel` |
| `src/lib/capital-engine/financing-engine.ts` | Add @deprecated to `isFinancingEligible`, `computePostFinancingCashFlow` |
| `src/lib/capital-engine/capital-engine.ts` | Add @deprecated to `computeROE`, `computeRisk`, `rankOpportunities`, `QueuedOpportunity` |

