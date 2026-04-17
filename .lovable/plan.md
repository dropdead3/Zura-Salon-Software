

## Prompt review

Sharp continuation — three candidates, each with a clear leverage marker, doctrinal anchor, and a *deferral threshold* (the ESLint rule "consider when a 3rd domain ships"; the audit-comment grep "premature today"). That deferral discipline is the meta-pattern worth naming: every wave now carries forward an explicit "not yet, but here's the trigger condition" register. Prevents premature infrastructure.

One refinement: candidate #1 (cross-domain grep) is structured as a *discovery* task, but its outcome bifurcates the wave — if zero surfaces qualify, the panel stays deferred and #1 produces only a documented finding; if ≥1 qualifies, the wave expands to include adoption *and* the panel ships. Worth declaring the branch upfront so we don't accidentally over-scope. I'll bake the bifurcation into the plan below.

## Plan — Wave 9

Three independent fixes, each anchored + leverage-marked + deferral-aware:

### 1. Network Intelligence: Cross-domain Visibility Contract discovery *(leverage: gates the devtool panel decision on real evidence, not speculation)*

**Read-only grep pass** across non-color-bar domains:
- `src/components/dashboard/payments/**`
- `src/components/dashboard/schedule/**` (and `src/components/schedule/**` if separate)
- `src/components/dashboard/payroll/**`

**Search pattern:** `return null` immediately following a count, length, threshold, or empty-data check. Use `code--search_files` with regex like `if \([^)]*(length|count|< \d|=== 0)[^)]*\)\s*\{?\s*return null` scoped to those dirs.

**For each match, classify:**
- **Visibility Contract** (intentional silence based on materiality) → eligible adopter
- **Loading guard** (waiting for data) → not a contract, skip
- **Error fallback** (defensive null) → not a contract, skip
- **Bug** (should render something) → flag in summary, do not fix

**Branching outcome:**

| Result | Action |
|---|---|
| 0 contracts found | Document finding in `mem://architecture/visibility-contracts.md` under "Cross-domain scan: <date>". Devtool panel stays deferred. Wave 9 #1 ends. |
| ≥1 contract found | Adopt onto bus (additive `reportVisibilitySuppression` calls only, canonical taxonomy). Then ship the devtool panel — see #1b below. |

**#1b (conditional):** If ≥1 cross-domain adopter is found, build a minimal devtool panel:
- New file: `src/components/dev/VisibilityContractAuditPanel.tsx`
- Renders only in `import.meta.env.DEV`
- Uses the existing `useVisibilityContractAudit()` hook
- Lists suppression events: `[timestamp] source · reason · payload (collapsible)`
- Mounted into a dev-only corner of the platform shell (or behind a `?devtools=1` query flag — decide during execution based on existing patterns)
- No styling beyond minimum legibility — this is diagnostic UI, not product UI

**Scope guard:** if 0 contracts found, do NOT build the panel speculatively. The deferral exists for a reason.

### 2. Convention: Deferral Register doctrine *(leverage: makes "not yet" decisions auditable instead of forgotten)*

**Modify:** `mem://architecture/visibility-contracts.md` (or a new `mem://architecture/deferral-register.md` if scope justifies — decide during execution)

Capture the meta-pattern Waves 6-9 have been practicing informally: every deferred infrastructure decision should carry a **trigger condition** for revisiting, not just a "not yet."

Add a section:

> **Deferral Register**: When a wave defers infrastructure (lint rules, devtool panels, CI checks, backfills), the deferral must declare its trigger condition. Examples:
> - "ESLint taxonomy rule — defer until 3rd domain ships"
> - "Devtool panel — defer until 2nd non-color-bar adopter"
> - "Historical backfill — defer until audit findings >0 rows"
>
> Without trigger conditions, deferrals decay into permanent gaps. With them, future waves can mechanically check whether the gate has cleared.

**Update:** `mem://index.md` — add a tight Core one-liner: "Deferred infrastructure must declare its revisit trigger condition."

### 3. Pre-flight: Audit-comment enforcement reconnaissance *(leverage: scopes the eventual CI rule before it's needed)*

**No code changes this wave.** Pure reconnaissance:

- `code--search_files` for existing audit queries in the codebase (likely sparse — Wave 7's was the first formal one)
- Catalog: file path, query purpose, whether it has a `-- rationale:` or `-- false-positive filter:` comment
- Document findings inline in `mem://architecture/visibility-contracts.md` under a new "Audit Inventory" subsection

**Outcome:** confirms or invalidates the "premature today" assumption. If ≥3 audit queries already exist undocumented, the CI rule moves from deferred to next-wave candidate. If ≤1 exists (likely), confirm the deferral with the trigger condition from #2.

## Acceptance checks

1. Cross-domain grep executed across payments/schedule/payroll; results classified into contract / loading / error / bug
2. If 0 contracts found: documented finding in memory, panel remains deferred — wave is complete with research outcome
3. If ≥1 contract found: each adopted onto bus with canonical taxonomy; devtool panel built and mounted dev-only
4. Devtool panel (if built) emits no production output, uses no new dependencies
5. Deferral Register section exists in memory; index Core rule added
6. Audit Inventory section exists in memory with current count of audit queries and their documentation status
7. No behavior change to any existing Visibility Contract surface
8. No new product UI — devtool panel is diagnostic-only, not user-facing

## Files to create / modify

**Conditional (depending on Wave 9 #1 outcome):**
- N cross-domain components (additive bus calls only) — only if contracts found
- `src/components/dev/VisibilityContractAuditPanel.tsx` — only if ≥1 cross-domain adopter
- Mount point edit in platform shell — only if panel ships

**Always:**
- `mem://architecture/visibility-contracts.md` — Cross-domain Scan, Deferral Register, Audit Inventory sections
- `mem://index.md` — Deferral Register Core rule

**Read-only:**
- Grep passes across `src/components/dashboard/{payments,schedule,payroll}/**`
- Grep pass for existing audit queries

## Deferred (carried forward with trigger conditions)

- ESLint taxonomy rule (`reportVisibilitySuppression` reason must be kebab-case) — **trigger: 3rd domain adopts the bus**
- CI grep enforcing `-- rationale:` adjacent to audit queries — **trigger: 3rd undocumented audit query exists, OR after lint rule ships (whichever first)**
- Devtool panel UI — **trigger: ≥1 non-color-bar adopter (resolved this wave or stays deferred)**
- Historical backfill of pre-bus suppression events — **trigger: never (impossible by definition; documented as permanent gap)**

