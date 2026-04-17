

## Prompt review

Strong continuation — three candidates, each with a clear leverage marker and doctrinal anchor. The Wave 8 sweep is the right next move: ship the mechanical coverage now, while the bus API and reason taxonomy are fresh, before adopter drift sets in. The "self-validating audits" suggestion is particularly mature — it formalizes a discipline you're already practicing (Wave 7's inline comment) before it becomes informal tribal knowledge.

One refinement: the kebab-case taxonomy table should also include a **tier** column (e.g., `loading` is universal, `no-data` is common, `insufficient-points` is contract-specific). Without tiers, every adopter invents its own contract-specific reasons and the taxonomy bloats. Group by tier so future adopters know which reasons to reuse vs which to extend.

## Plan — Wave 8

Three independent, doctrinally-anchored fixes:

### 1. Network Intelligence: Sweep 7 candidates onto the bus *(leverage: completes the doctrinal grep in <30 min, locks in coverage before drift)*

Read each of the 7 documented future candidates from `mem://architecture/visibility-contracts.md`, identify their suppression branch (`return null` after a threshold/empty check), and add a single `reportVisibilitySuppression(...)` call.

**Mechanical contract for each adopter:**
- Source: kebab-case component name (e.g. `blueprint-checklist`, `exception-badge`)
- Reason: drawn from the canonical taxonomy (see #2)
- Payload: the *actual numbers* that drove the suppression (count, threshold, etc.) — never abstract booleans

**Candidates** (per memory file):
- `BlueprintChecklist` → `blueprint-checklist`
- `ExceptionBadge` → `exception-badge`
- (5 others documented in `mem://architecture/visibility-contracts.md` Known Adopters / Future Candidates section — read first to confirm exact list before sweeping)

**Pre-step:** `code--view mem://architecture/visibility-contracts.md` to read the exact candidate list and current Known Adopters section. Then `code--search_files` for each to locate the `return null` line.

**Scope guard:** marking pass only. No logic changes, no UI changes, no new dependencies. If a candidate's suppression branch is *not* a Visibility Contract on inspection (e.g., it's actually a loading bug), skip it and flag in the wave summary.

### 2. Convention: Reason taxonomy table in memory *(leverage: prevents drift like `noData` vs `no-data` vs `empty`)*

**Modify:** `mem://architecture/visibility-contracts.md`

Add a "Reason Taxonomy" section with a tiered kebab-case table:

| Tier | Reason | When to use |
|---|---|---|
| Universal | `loading` | Data still fetching |
| Universal | `no-data` | Query returned empty / null |
| Universal | `error` | Fetch failed (rare in suppressions, but reserved) |
| Common | `below-threshold` | Single-value gate unmet (e.g., total < N) |
| Common | `no-trigger-window` | Time-bucketed gate unmet (e.g., no week ≥ N) |
| Common | `insufficient-points` | Series-based gate unmet (e.g., < N data points) |
| Contract-specific | `<custom>` | When none of the above fit; document in the adopter's source comment |

**Rules added to memory:**
- Always kebab-case (`no-data`, never `noData` or `no_data`)
- Always reuse Universal/Common reasons before inventing
- Contract-specific reasons must be commented at the call site explaining why no Common tier reason applied

### 3. Doctrine: Self-validating audits *(leverage: every future audit query is interpretable without tribal context)*

**Modify:** `mem://architecture/visibility-contracts.md` (or new file if scope warrants — decide during execution)

Add a "Self-Validating Audits" subsection capturing the discipline from Wave 7:

> Every read-only audit query that flags suspect rows must declare its false-positive filter inline as a SQL comment. The comment must answer: *why is a flagged row probably drift, not just possibly drift?*
>
> Example (from Wave 7): `-- Only flag rows where the org has *any* entitlement activity now — a recorded_count=0 with current activity is almost certainly a write-time omission, not legitimate "zero locations affected."`
>
> Without this comment, audit findings are unfalsifiable claims. With it, reviewers can challenge or trust the filter logic without re-deriving it.

**Update:** `mem://index.md` — extend the existing Visibility Contracts core rule, or add a tight one-liner: "Audit queries must document their false-positive filter inline."

## Acceptance checks

1. All 7 documented future candidates emit to the bus (or are explicitly flagged as not-actually-contracts in the wave summary)
2. Each new bus call uses a reason from the canonical taxonomy, or includes a source comment explaining the contract-specific extension
3. `mem://architecture/visibility-contracts.md` contains the tiered Reason Taxonomy table
4. `mem://architecture/visibility-contracts.md` contains the Self-Validating Audits subsection with the Wave 7 example
5. `mem://index.md` reflects the audit-comment rule (extended or new line)
6. No behavior change to any swept component — only additive instrumentation
7. Existing adopters (`SuspensionVelocityCard`, `ChemicalCostTrendCard`, `SeasonalDemandOverlay`) re-checked for taxonomy compliance; if any used a non-canonical reason, normalize it
8. No production console output from the bus (existing safety net preserved)

## Files to create / modify

**Modify:**
- 7 candidate components (additive `reportVisibilitySuppression(...)` calls only) — exact list confirmed via `mem://architecture/visibility-contracts.md` pre-read
- `mem://architecture/visibility-contracts.md` — add Reason Taxonomy + Self-Validating Audits sections + update Known Adopters
- `mem://index.md` — extend or add the audit-comment core rule
- Possibly `SuspensionVelocityCard.tsx` / `ChemicalCostTrendCard.tsx` / `SeasonalDemandOverlay.tsx` if their existing reasons drift from the new taxonomy (e.g., `no-trigger-week` → `no-trigger-window`)

**New:**
- None (taxonomy + audit doctrine fold into existing memory file)

## Deferred (not in this wave)

- Devtool panel UI consuming `useVisibilityContractAudit` — still gated on a second non-color-bar adopter
- Linting/CI enforcement of taxonomy (e.g., ESLint rule rejecting `noData`) — premature at 10 adopters; revisit at 25+
- Backfilling reason payloads for events that fired before the bus existed — impossible by definition, document as known gap

