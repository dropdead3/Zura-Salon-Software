

# Step 2K — Full shadcn token coverage, and CI onboarding docs

Two enhancements, same Step 2J foundation. Part A is a two-line change that extends canon coverage from 4 semantic tokens to 15 (every shadcn token redefined per theme). Part B converts tribal knowledge about the Check gate into onboarding material.

**Priority read**: Part A is the mechanical win (the infrastructure already exists — we're just feeding it more tokens). Part B is the human-layer completion so new contributors don't learn the gate by breaking it.

## Part A — Extend TOKENS array to full shadcn set

**What we're asserting**

Same three rules already proven on `destructive` / `success` / `warning` / `info`, now applied to every shadcn token that every theme redefines:

- **Core surfaces**: `background`, `foreground`, `card`, `popover`
- **Interactive**: `primary`, `secondary`, `accent`, `muted`
- **Form/chrome**: `border`, `input`, `ring`

The canon catches: (a) a new theme forgetting to redefine one of these, (b) a raw `#hex` or `rgba()` sneaking onto any line mentioning the token, (c) a Tailwind config edit that bypasses HSL routing.

**Why this scope, not more**

These 11 tokens (plus the existing 4) are the shadcn-standard set that `tailwind.config.ts` routes through `hsl(var(--token))`. Every theme in `index.css` must redefine all of them or the theme renders broken. Tokens outside this set (chart colors, sidebar tokens, custom surface tokens) follow different conventions and deserve their own canon if ever needed — not bundled here.

**Pre-flight reality check (will happen during implementation)**

Before expanding the array, I'll:
1. Grep `src/index.css` for which of the 11 tokens actually exist. The existing `describe.skip` branch handles missing tokens cleanly, but knowing up front lets me flag any surprises.
2. Grep `tailwind.config.ts` for which tokens have config blocks. The existing `it.skipIf(!configBlock)` branch handles missing config entries.
3. If any raw hex/rgba violations surface on the first pass, triage them using the Step 2F three-bucket pattern: **fix** (route through HSL), **annotate** (`/* intentional literal: <reason> */`), or **delete** (dead code).

Expected outcome: most tokens pass cleanly (the codebase has been disciplined). A handful may need annotations where hex is intentional (e.g., glass-morphism overlays, gradient stops). Zero "fix" cases likely, since any raw literal here would already be breaking at least one theme visually.

**File**

`src/test/semantic-token-canon.test.tsx` — one change:

```ts
const TOKENS = [
  "destructive", "success", "warning", "info",
  "background", "foreground",
  "card", "popover",
  "primary", "secondary", "accent", "muted",
  "border", "input", "ring",
] as const;
```

Nothing else changes — `describe.skip` and `it.skipIf` handle gaps, and the parameterized assertions are already token-agnostic.

**Comment update**: Update the file-level doc comment from "Cross-cutting tokens (`--destructive`, `--success`, `--warning`, `--info`)" to reflect the expanded set. Two-sentence tweak.

**Acceptance (Part A)**

1. `npx vitest run src/test/semantic-token-canon` passes on current codebase.
2. Reporter shows 15 token suites (or fewer with visible skips for any token missing from CSS).
3. Deleting `--primary: 220 85% 55%;` from a single `.theme-*` block in `index.css` fails the "every `--primary` declaration sits in a token-definition selector" test with a clear line-number violation.
4. Any tokens requiring `/* intentional literal: ... */` annotations are documented inline in `index.css` with the reason.
5. Total test file stays under 100 lines (parameterization continues to pay for itself).

## Part B — `docs/ci.md` onboarding doc

**What ships**

A single `docs/ci.md` (~3 paragraphs, ~60 lines) documenting the Check gate in contributor-facing language. Not a spec, not doctrine — just enough for a new contributor to understand: what runs, where, why, and how to escape when the build is on fire.

**Structure**

```markdown
# CI Gate — `check`

## What runs
Brief description of Stylelint (CSS canon: no raw hex/rgba outside token blocks)
and Vitest (semantic-token canon, scrollbar canon). Points to
tools/stylelint-plugins/ and src/test/semantic-token-canon.test.tsx as the
authoritative sources.

## Running locally
- `npm run check` runs the same gate CI runs (once the script lands).
- `npm run test` for fast Vitest iteration.
- `npx stylelint "src/**/*.css"` for targeted lint runs.

## Pre-commit hook (Husky + lint-staged)
What the hook does (lint-staged runs stylelint on staged .css files, eslint on
staged .ts/.tsx). Why Vitest is deliberately not in the hook (unrelated-file
failures would block unrelated commits). Note: hook requires running
`npm install` after first clone to auto-install via the `prepare` script.

## Emergency override
`git commit --no-verify` bypasses the hook. Rules of use:
1. Only when the hook is blocking an urgent fix and the failure is known-safe.
2. Immediately follow up with a separate commit that fixes the skipped check.
3. CI will still catch it — override is a delay, not an escape.

## Adding a new canon
Points to src/test/semantic-token-canon.test.tsx as the extension point for
new semantic tokens. Points to tools/stylelint-plugins/ for new CSS-level
rules. Links to the step-by-step pattern in recent canon additions.
```

**What I'm deliberately not doing**

- No attempt to document Husky/lint-staged setup itself — that's in the manual-action list from Step 2I, and until those land, documenting them invites confusion. The doc references them as "once installed" so it's accurate either way.
- No GitHub Actions workflow deep-dive — the `.github/workflows/test.yml` file is the source of truth. The doc points to it, doesn't duplicate it.
- No branch-protection setup instructions — that's a repo-settings screenshot/walkthrough that doesn't belong in a code-repo doc. One-line reference: *"In repo settings → Branches, add `check` to required status checks on `main`."*

**Cross-link from README**

Add one line to the project README (if it has a "Development" or "Contributing" section): `See docs/ci.md for the CI gate and pre-commit hook.` If the README lacks such a section, skip the cross-link — don't invent a section just to link from.

**Acceptance (Part B)**

1. `docs/ci.md` exists, under ~60 lines, covers all four sections (what runs / local / Husky / override).
2. Emergency-override section is explicit about the "delay, not escape" framing — contributors can't misread it as a free pass.
3. Links to concrete files (`tools/stylelint-plugins/`, `src/test/semantic-token-canon.test.tsx`, `.github/workflows/test.yml`) so readers can jump from doc to source.
4. README cross-link added if a suitable section exists; otherwise skipped with a note in the implementation summary.

## Technical notes

- **`describe.skip` handles missing tokens loudly** — if `--ring` doesn't exist in a user's `index.css` fork, the reporter shows `semantic token canon: --ring (not defined in index.css)` as skipped, not silently passing. This is the Step 2J safety net doing its job.
- **Token order in the array affects reporter readability** — grouped by role (semantic status → surfaces → interactive → form/chrome) so CI output reads top-down in logical order rather than alphabetically.
- **`docs/ci.md` deliberately avoids screenshots or GIFs** — they rot the moment the CI UI changes. Plain-text doc ages gracefully.
- **No attempt to move doctrine** into `docs/` — project doctrine lives in `.lovable/memory/` and project-knowledge custom instructions. The new doc is operational contributor material, not architectural governance.

## Out of scope

- Extending canon to **chart tokens** (`--chart-1` through `--chart-5`), **sidebar tokens**, or **custom app-specific tokens** — different conventions (charts may intentionally be raw hex for palette control; sidebar uses its own HSL family). Each deserves its own canon if regressions appear. Step 2L+ territory.
- Writing a **CONTRIBUTING.md** — broader scope than CI; separate decision.
- **Auto-generating the TOKENS array from `index.css`** — extracting every `--foo:` declaration at test-time would catch even unknown tokens, but it conflates "token exists" with "token should be canon-guarded." Some tokens are intentionally not cross-cutting. Explicit list beats auto-discovery here.
- Documenting **emergency override for CI** (e.g., how to force-merge a PR with failing checks) — that's a repo-admin capability, not a contributor-facing flow. If needed, belongs in an internal runbook, not public docs.

## Prompt feedback

**What worked**: You paired the two enhancements tightly (canon expansion + contributor docs) and scoped each with one concrete artifact — the `TOKENS` array change, and `docs/ci.md`. That framing prevents plan drift because there's nowhere to expand to.

**What could sharpen**: You described Part A as "two-line change" — accurate for the test file, but the plan still has to cover the pre-flight grep, the annotation triage for any violations surfaced, and the reporter-verification step. A tighter prompt framing would be: *"Two-line test change, plus whatever annotations surface during the audit pass — treat violations with the Step 2F three-bucket pattern."* That explicitly gives the AI permission to do the audit work without re-scoping the plan.

**Better prompt framing for next wave**: You've been implicitly bundling "build the thing + enforce the thing" (tests + lint rule, canon + CI, canon + docs). Making that explicit as a standing pattern in project memory — *"Every canon ships with enforcement AND onboarding material"* — would save the AI from having to re-derive the pairing each step. Consider saving that to `mem://architecture/canon-pattern.md` once this step lands.

## Enhancement suggestions for next wave

1. **Step 2L — Save the canon pattern to memory.** One memory file documenting the five-part structure of every canon shipped so far: (a) the invariant being guarded, (b) the Vitest assertion, (c) the Stylelint rule if applicable, (d) the CI gate entry, (e) the override protocol. Makes the pattern repeatable by future contributors (or future AI sessions) without re-deriving from step history.

2. **Step 2M — Audit chart tokens as a standalone decision.** Chart colors (`--chart-1`–`--chart-5`) are the one semantic family deliberately excluded from this step. Worth a dedicated look: are they consistent across themes? Do they need their own canon (probably yes, with looser rules since palette variation is intentional) or are they fine as-is? Single question: *"What's the invariant for chart tokens?"* — then decide whether to guard it.

