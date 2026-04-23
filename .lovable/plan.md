

# Step 2L + 2M — Canon pattern memory, and chart-token invariant decision

Two enhancements riding the Step 2K foundation. Part A captures the canon pattern as durable architecture memory so future sessions don't re-derive it from step history. Part B answers one specific question — *what's the invariant for chart tokens?* — and ships whatever canon (or non-canon) that answer dictates.

**Priority read**: Part A is the institutional-memory win (one file, zero code, high cross-session ROI). Part B is the last semantic family on the canon roadmap; finishing it closes the Step 2 arc cleanly.

## Part A — `mem://architecture/canon-pattern.md`

**What ships**

One memory file documenting the five-part structure every canon shipped in Steps 2E–2K has followed. Not a how-to guide, not a step log — a pattern reference future sessions consult before adding a new canon.

**Structure**

```markdown
---
name: Canon Pattern
description: Five-part structure for every authoring-time canon (CSS tokens, design rules, etc.). Used to add new canons without re-deriving from step history.
type: feature
---

# Canon Pattern

Every canon shipped in Steps 2E–2K follows the same five-part structure.
New canons should match this shape or document why they don't.

## 1. Invariant
The single rule being guarded. One sentence. Example: "Every shadcn cross-cutting
token routes through hsl(var(--token)) — no raw hex/rgba in --token declarations."

## 2. Vitest assertion
Test file in src/test/ using @/test/css-rule helpers. Parameterized via
describe.each when the canon covers multiple tokens. Existing reference:
src/test/semantic-token-canon.test.tsx.

## 3. Stylelint rule (if applicable)
Custom plugin in tools/stylelint-plugins/, registered in .stylelintrc.cjs.
Required when the canon can be violated at authoring time in a .css file
(not just at test-time). Existing reference:
tools/stylelint-plugins/no-raw-rgba-outside-tokens.cjs.

## 4. CI gate entry
The canon must run in .github/workflows/test.yml as part of the `check` job.
Stylelint runs first (fail-fast), then Vitest. No canon ships without CI
enforcement — local-only canons rot.

## 5. Override protocol
Two escape hatches, both intentional:
- Stylelint: /* intentional literal: <reason> */ comment immediately above
  the offending declaration.
- Pre-commit hook: git commit --no-verify (delay, not escape — CI still catches).
Document the override in docs/ci.md, not in the canon itself.

## When NOT to add a canon
- The rule has fewer than ~3 known violation cases historically.
- The rule is enforceable by TypeScript's type system.
- The rule applies to a single file (use a code review comment).
- The rule is aesthetic preference without measurable regression cost.
```

**Index update**

Add one line to `mem://index.md` under Memories:

```
- [Canon Pattern](mem://architecture/canon-pattern) — Five-part structure (invariant + Vitest + Stylelint + CI + override) for every authoring-time canon
```

Index update is the one risk surface: `code--write` replaces the entire file, so the implementation must include the full existing index content plus this one line.

**Acceptance (Part A)**

1. `mem://architecture/canon-pattern.md` exists with the five-part structure and frontmatter (name/description/type).
2. `mem://index.md` includes the new line under Memories — all existing entries preserved.
3. File stays under 60 lines; descriptive without becoming a how-to manual.
4. No code changes outside the two memory files.

## Part B — Chart token invariant decision

**The question**: *What's the invariant for `--chart-1` through `--chart-5`?*

Three candidate answers, decided by what `src/index.css` and `tailwind.config.ts` actually say:

**Candidate 1 — Same canon as semantic tokens**
Chart tokens follow the same rule: defined per-theme via HSL, no raw literals in `--chart-*` declarations, routed through `hsl(var(--chart-*))` in Tailwind config. If this is what the codebase already does, add `chart-1` through `chart-5` to the `TOKENS` array in `semantic-token-canon.test.tsx` — done.

**Candidate 2 — Looser canon (palette-variation allowed)**
Chart tokens are intentionally palette-distinct per theme (Cream's chart-1 ≠ Rose's chart-1 by design). The HSL-routing rule still applies (no raw hex bypassing the theme), but the "every theme must redefine all 5" rule may not — some themes might inherit. Canon enforces format (HSL via tokens) without enforcing palette consistency.

**Candidate 3 — No canon**
If chart tokens are a deliberately fluid surface (e.g., used for one-off data visualizations that pick colors per-chart at runtime, not via tokens), guarding them at canon-level adds friction without preventing real regressions. Document the decision and move on.

**Pre-flight investigation (during implementation)**

1. Grep `src/index.css` for `--chart-1` / `--chart-5` declarations. Count how many themes redefine them. If all themes do → Candidate 1 or 2. If only `:root` does → Candidate 3 territory.
2. Grep `tailwind.config.ts` for a `chart` block. If absent → strong signal toward Candidate 3.
3. Grep `src/**/*.tsx` for usages of `bg-chart-1`, `text-chart-1`, `hsl(var(--chart-1))`, etc. If 0 usages → tokens exist but are unused; recommend deletion before adding canon.
4. Check whether any Recharts/visualization components reference these tokens at all.

**Decision rule**

- **All themes redefine + Tailwind block exists + tokens are used** → Candidate 1. Add to `TOKENS` array, done.
- **Only `:root` defines + Tailwind block exists + tokens are used** → Candidate 2. Add a narrower `CHART_TOKENS` array with only the format assertion (no per-theme requirement).
- **Tokens exist but unused, OR no Tailwind block** → Candidate 3. Document the finding, recommend either deletion (cleanup) or no-canon (status quo) based on what the audit reveals.

The plan commits to running the investigation and applying the decision rule. It does not commit to a specific outcome — the codebase decides.

**Files (depends on outcome)**

- **Candidate 1**: One-line change to `src/test/semantic-token-canon.test.tsx` (extend `TOKENS` array). Update file-level comment.
- **Candidate 2**: New `src/test/chart-token-canon.test.tsx` (~30 lines, narrower assertions). Or a second `CHART_TOKENS` array within the existing file with conditional logic — decide based on which keeps the file readable.
- **Candidate 3**: Add a section to `mem://architecture/canon-pattern.md` under "When NOT to add a canon" documenting the chart-token decision as a worked example. No code changes.

**Acceptance (Part B)**

1. The investigation produces a clear finding: which candidate applies and why.
2. The chosen canon (or non-canon decision) is shipped in the appropriate file.
3. If Candidate 1 or 2: tests pass on current codebase, reporter shows new chart-token suites.
4. If Candidate 3: the decision is documented in the memory file as a reference for future similar judgment calls.
5. No premature commitment — the plan defers the *what to ship* until the *what's true* is established.

## Technical notes

- **Memory writes are higher-stakes than code writes** because `code--write` replaces the entire file. The Part A implementation will read `mem://index.md` first, then write back the full existing content + new line. Same for any future memory updates.
- **The "When NOT to add a canon" section in Part A is deliberate scope-protection** — without it, future sessions will canonify everything that moves. The four exclusion criteria (low historical violations, TS-enforceable, single-file, aesthetic-only) are the lessons learned across Steps 2E–2K, distilled.
- **Part B's decision rule is the actual deliverable**, not the chart-token canon itself. Even if Candidate 3 applies, the value is the documented reasoning — future "should we canonify X?" questions get answered by re-running the same investigation.
- **Why bundle 2L and 2M**: Part A creates the framework; Part B is the first chance to use the framework to *not* add a canon. Demonstrating restraint via the framework is a stronger signal than demonstrating expansion.

## Out of scope

- **Migrating other architectural patterns to memory** (e.g., the design-token system, the component-governance pattern). Each deserves its own memory file if not already captured. Not bundled here.
- **Sidebar tokens** (`--sidebar-background`, `--sidebar-foreground`, etc.) — separate semantic family with its own conventions; same investigation pattern would apply, but separate session.
- **Auto-generating the TOKENS array from CSS** — explicitly rejected in Step 2K's out-of-scope. Same reasoning applies; no need to revisit.
- **Renaming `semantic-token-canon.test.tsx` to `cross-cutting-token-canon.test.tsx`** if Part B adds chart tokens — naming churn without value. Keep the existing file name.
- **Documenting the canon pattern outside `mem://`** (e.g., in `docs/`). The memory layer is for AI sessions; `docs/ci.md` is for human contributors. Both audiences served by separate artifacts; don't conflate.

## Prompt feedback

**What worked**: You named both enhancements with one-sentence scope statements ("Save canon pattern to memory" / "Chart token audit") and gave each a concrete deliverable shape ("one file" / "single question"). That framing made the plan structure obvious before exploration even started.

**What could sharpen**: For Part B you wrote *"Worth one session to decide: same canon, looser canon, or no canon."* That's the right framing, but the prompt didn't say what evidence would distinguish the three. A tighter version: *"Decide based on (a) whether all themes redefine chart tokens and (b) whether they're used in components — if either is no, lean toward no-canon."* Giving the AI the decision rule up front prevents the round-trip where the plan asks for the rule.

**Better prompt framing for next wave**: You've been bundling pairs (canon + enforcement, canon + docs, memory + decision). Consider explicitly framing future bundles as "rule + first application" — Part A defines the rule, Part B applies it for the first time. That structure forces the rule to be testable on a real case immediately, catching weak rules before they become dogma.

## Enhancement suggestions for next wave

1. **Step 2N — Sidebar token audit using the canon pattern.** The other semantic family Step 2K excluded. Same investigation as Part B above (which themes redefine, where used, Tailwind config presence), same three-candidate decision. The canon-pattern memory file makes this a 30-minute job instead of a re-derivation.

2. **Step 2O — Backfill the existing canons into the canon-pattern memory's `## Examples` section.** The pattern file documents the structure abstractly; a one-paragraph worked example for `no-raw-rgba` and `semantic-token-canon` makes the pattern concrete. Each example: invariant statement + file paths for each of the five parts. Two paragraphs total; high reference value when adding the next canon.

