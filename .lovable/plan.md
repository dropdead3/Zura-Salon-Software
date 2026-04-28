
## Prompt feedback

Strong prompt. You connected two enhancements to **why they matter** (closing the loop between authoring-time enforcement and runtime teaching; preventing the $500 floor from being absurd at solo scale) and you supplied concrete tier defaults. That's the right shape: directive on intent, opinionated on numbers, leaves implementation to me.

One tightening for next time: name the **persona signal source** explicitly ("use `organization.settings.persona`" or "infer from active location count"). Both exist in different forms in this codebase, and a reviewer plan can stall waiting on that decision. Pre-pinning the input source makes plans land in one pass instead of two.

---

## Plan

### 1. Wire `CARD_QUESTIONS` into the Customize menu hover state

**Where the surface lives.** `SortablePinnedCardItem.tsx` already renders an `Eye` hover card per card row in the Customize panel — currently shows `<AnalyticsCardPreview />` plus a generic "Preview with example data" caption. This is the doctrine teaching slot.

**Change.** Add a header above the preview inside the hover card:

- Top line: the canonical **question** from `CARD_QUESTIONS[cardId]`, in `font-display tracking-wide` (Termina, uppercase) — the doctrinal voice.
- Below it: the existing `CARD_DESCRIPTIONS[cardId]` text in `font-sans` body tone as the explanatory layer (the question = "what it answers"; the description = "how it answers it").
- Then the existing `<AnalyticsCardPreview />` and caption.

Layered, not replaced — the description already does useful work for cards (e.g. Locations Status) where the question alone is too terse.

**Registry colocation.** Move `CARD_DESCRIPTIONS` out of `PinnedAnalyticsCard.tsx` (it's currently a 30-line local const) and into `src/components/dashboard/analytics/cardDescriptions.ts`, mirroring `cardQuestions.ts`. `PinnedAnalyticsCard.tsx` re-imports it. This makes both registries reachable from the Customize menu without pulling the analytics card module's full dep graph into the menu chunk.

**Coverage invariant.** Extend `src/__tests__/card-questions-uniqueness.test.ts` with a second assertion: every `cardId` in `PINNABLE_CARDS` (imported from `DashboardCustomizeMenu.tsx`) must have an entry in both `CARD_QUESTIONS` and `CARD_DESCRIPTIONS`. CI fails if a new pinnable card ships without doctrine copy.

**Files**
- EDIT `src/components/dashboard/SortablePinnedCardItem.tsx` — add question + description header in the HoverCard content
- NEW `src/components/dashboard/analytics/cardDescriptions.ts` — extracted registry
- EDIT `src/components/dashboard/PinnedAnalyticsCard.tsx` — import the registry instead of defining it locally
- EDIT `src/__tests__/card-questions-uniqueness.test.ts` — assert pinnable-card coverage in both registries

### 2. Move materiality thresholds into org defaults (persona-tiered)

**Decision: persona signal source.** The closest existing tier signal on `organization.settings` is the persona / operator-size hint already used for policy applicability. Rather than invent a new field, extend `OrgDefaults` (`src/types/orgDefaults.ts`) with an optional `materiality` block. If absent, fall back to a tier inferred from active location count read from `OrganizationContext`:

```text
locations <= 1   -> 'solo'    -> $100
locations 2..3   -> 'owner'   -> $500
locations >= 4   -> 'multi'   -> $2000
```

This keeps the doctrine **structure precedes intelligence** intact: the gate has a defined floor for every org from day one, and Account Owners can override it explicitly.

**Schema (additive, no migration).**

```ts
// src/types/orgDefaults.ts
export interface OrgDefaults {
  currency?: string;
  timezone?: string;
  locale?: string;
  materiality?: {
    /** USD floor below which delta comparisons are suppressed as noise */
    execSummaryMinVolumeUsd?: number;
    /** % delta within ± this is rendered as "Flat" */
    execSummaryFlatDeltaPct?: number;
  };
}
```

`getOrgDefaults` parses the new block defensively. `ORG_DEFAULTS_FALLBACKS` gains `materiality: { execSummaryMinVolumeUsd: 500, execSummaryFlatDeltaPct: 2 }` as the safe default for the no-context case (e.g. server-side or test).

**Resolution hook.** New thin hook `useMaterialityThresholds()` in `src/hooks/useMaterialityThresholds.ts`:

1. Reads `useOrgDefaults().raw.materiality` — if explicit, return it.
2. Else infer tier from `effectiveOrganization` location count (read via existing `useOrganizationContext`), map to the table above, return that.
3. Always returns `Required<NonNullable<OrgDefaults['materiality']>>`.

**Wire-in.** In `PinnedAnalyticsCard.tsx`, replace the two module-level constants:

```ts
const EXEC_SUMMARY_MIN_VOLUME_USD = 500;
const EXEC_SUMMARY_FLAT_DELTA_PCT = 2;
```

with `const { execSummaryMinVolumeUsd, execSummaryFlatDeltaPct } = useMaterialityThresholds();` inside the component, and update the existing `belowVolumeThreshold` / `isFlat` checks to read from those values. The "Volume below comparison threshold" label stays generic — does not leak the dollar floor (avoids implying a hard rule the operator didn't set).

**Settings exposure (deferred but registered).** Per the **Deferral Register** doctrine, do not build a settings UI for this in the same wave — overrides are reachable via existing org settings if needed, and the inference is the right default for >95% of orgs. Add a one-line entry in `mem://architecture/visibility-contracts.md` Deferral Register table:

```
Materiality threshold UI | Revisit when ≥3 orgs override via DB or request a UI.
```

**Files**
- EDIT `src/types/orgDefaults.ts` — add optional `materiality` block + parse + fallbacks
- NEW `src/hooks/useMaterialityThresholds.ts` — explicit-then-tier-inference resolver
- EDIT `src/components/dashboard/PinnedAnalyticsCard.tsx` — replace constants with hook call
- EDIT `mem://architecture/visibility-contracts.md` — Deferral Register entry

### Out of scope (intentional)

- No DB migration. `organization.settings` is `jsonb`; new keys are additive and read defensively.
- No Customize-menu UI for thresholds. Deferred per register.
- No change to the **third** redundant-revenue surface logic — Sales Overview / Revenue Breakdown / Daily Brief differentiation already shipped.

---

## Enhancement suggestions

1. **Telemetry on suppressed deltas.** Once thresholds are tier-aware, log (dev-only, via `visibility-contract-bus`) every time the Executive Summary suppresses a comparison. After a week, you'll know empirically whether `$100 / $500 / $2000` are right or whether solo operators are still hitting the floor.
2. **Promote the question pattern.** The HoverCard treatment ("Question → Description → Preview") is reusable for any pinnable surface registry — Goals, KPIs, Reports. Worth lifting to a `<DoctrinePreview cardId=… />` primitive once a second consumer appears.
3. **Persona-aware materiality elsewhere.** The same tier resolver could feed forecasting confidence floors, staffing-trend volatility windows, and goal-pace minimum-volume gates. Don't generalize prematurely, but flag it: every "is this number meaningful?" gate is a candidate.
