

# Step 2J — Extend canon to --success / --warning / --info, and add CI enforcement

Two enhancements riding the Step 2I foundation. Part A replicates the `--destructive` canon across three more semantic tokens — one parameterized test file, ~40 lines total. Part B shifts enforcement from local Husky goodwill to merge-blocking CI via GitHub Actions.

**Priority read**: Part A is the quick ROI win (pattern proven, three tokens get guarded in one file). Part B is the architectural completion — without CI, the canon is still bypassable via `--no-verify`.

## Part A — Parameterized semantic-token canon

**What we're asserting**

For each of `success`, `warning`, `info`: same three rules as `destructive`:
1. No raw hex / rgba literal on any line mentioning the token name in `src/index.css`.
2. Every `--<token>` declaration lives in a token-definition block (`:root`, `.dark`, `.theme-*`, `[data-theme]`).
3. `tailwind.config.ts` routes the token through `hsl(var(--<token>))` / `hsl(var(--<token>-foreground))` if the token exists in the config.

**Pre-flight check (will do during implementation, not now in plan mode)**

Before writing the test, confirm which of `--success`, `--warning`, `--info` actually exist in `src/index.css` and `tailwind.config.ts`. If any is missing:
- **Missing from CSS + config**: skip that token with a clear comment in the test file. Canon applies to tokens that exist; we don't invent them.
- **Present in CSS but not in Tailwind config**: run the first two assertions only, skip the Tailwind assertion for that token.
- **Present in config but not CSS**: flag it as a separate finding — config references a token that doesn't exist — but don't block this step.

Expected outcome based on the `--destructive` pattern: all three likely exist (semantic palette tends to ship complete), but we verify rather than assume.

**File**

`src/test/semantic-token-canon.test.tsx` — one file, parameterized via `describe.each`:

```ts
const TOKENS = ["destructive", "success", "warning", "info"] as const;

describe.each(TOKENS)("semantic token canon: --%s", (token) => {
  it(`no raw hex or rgba literal on a line mentioning '${token}' in index.css`, ...);
  it(`every --${token} declaration sits in a token-definition selector`, ...);
  it(`tailwind.config.ts routes ${token} through hsl(var(--${token}*))`, ...);
});
```

**Merge with existing `destructive-token.test.tsx`**: Yes. With four tokens following identical logic, keeping `destructive-token.test.tsx` as a one-off file alongside a multi-token file is duplication. Migrate destructive into the parameterized file and delete `destructive-token.test.tsx`. Single source of truth for the semantic-token canon.

**Handling the Tailwind-assertion edge case**

The tailwind config may not have entries for every token. The test conditionally skips (`it.skipIf(!hasBlock)`) when a token block is absent, with a `console.info` noting the skip so it's visible in CI logs. No false failures, no silent holes.

**Acceptance (Part A)**

1. `npx vitest run src/test/semantic-token-canon` passes on current codebase.
2. All four tokens (`destructive`, `success`, `warning`, `info`) covered; tokens missing from config skip the Tailwind assertion with a logged note.
3. Inserting `color: #16a34a; /* success */` into a new `.ok` rule fails the success suite.
4. `src/test/destructive-token.test.tsx` deleted; no regression in canon coverage.
5. Total test-file line count across semantic-token canon stays under ~80 lines (parameterization pays for itself).

## Part B — GitHub Actions check workflow

**What we're shipping**

A `.github/workflows/check.yml` that runs `npm run check` (the composite Stylelint + Vitest gate) on every pull request and push to `main`. Complements the existing `.github/workflows/test.yml` — does not replace it.

**Relationship to existing `test.yml`**

The current workflow runs `bun run test` only (Vitest). It doesn't run Stylelint. Two options:

1. **Extend `test.yml`** — add a step running `bun run lint:css` before tests. Single workflow, runs in one job.
2. **Add `check.yml`** as a separate workflow — two independent checks, parallel jobs, clearer PR status UI.

**Recommendation: extend `test.yml`**. One workflow, one cache restore, faster total CI. Rename the workflow label from "Test" to "Check" to reflect the broader scope. The user's plan asked for `check.yml` specifically, but a single consolidated workflow is the better shape — one env setup cost, sequential fail-fast (lint first, then tests). Happy to split into two workflows if the user prefers the parallel-status UI.

**File**

`.github/workflows/test.yml` — modified:

```yaml
name: Check

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run lint:css
      - run: bun run test
```

One added step (`bun run lint:css`), workflow renamed. Fails fast on lint before spending CI time on tests.

**Prerequisite: `lint:css` script must exist in `package.json`**. From Step 2G summary it should be present (`"lint:css": "stylelint 'src/**/*.css'"`). Will verify during implementation; if missing, the workflow step won't resolve and we surface it as a separate manual-action item (same blocker that prevented Step 2H's `check` script from landing automatically).

**Acceptance (Part B)**

1. Pull requests trigger the `Check` workflow running Stylelint → Vitest.
2. A PR introducing a raw `rgba(0,0,0,0.3)` in `src/index.css` fails the `bun run lint:css` step and blocks merge.
3. A PR with a failing canon test fails the `bun run test` step.
4. Workflow runtime stays under 2 minutes (setup + install dominate; lint + test are seconds each).
5. Push to `main` runs the same gates — catches direct-commit regressions.

## Technical notes

- **`describe.each` makes each token a separate test block** in the Vitest reporter — a failure reports "semantic token canon: --success > no raw hex..." rather than a generic combined failure. Debuggability stays high.
- **`it.skipIf` handles config gaps cleanly** — skipped tests show in the reporter as intentional, not as passed (false green) or failed (false red).
- **The workflow rename is non-breaking** — GitHub Actions treats `name:` as display-only. Existing branch protection rules reference `Check` by job name (`check`) not workflow name; renaming the workflow doesn't affect required-check configurations.
- **CI + Husky = belt and suspenders**. Husky catches regressions at commit time locally; CI catches them at PR time (including when contributors bypass Husky via `--no-verify`, use the GitHub web editor, or commit from a fresh clone before running `npm install`).
- **What I'm explicitly not doing**: adding `npm audit`, `tsc --noEmit`, or ESLint on `.ts`/`.tsx` to the CI workflow. Scope is "enforce the CSS canon at merge time," not "expand CI coverage broadly." Any of those are legitimate Step 2K+ moves.

## Out of scope

- Branch protection rules requiring the `Check` status to pass before merge — that's a repo-settings change, not a code change. Surface as a one-line manual action: *"In GitHub repo settings → Branches → add `check` to required status checks on `main`."*
- Running the workflow on forks with secret access — the check workflow needs no secrets, so fork PRs run fine by default.
- Adding Dependabot config, CodeQL, or other security workflows — unrelated to the canon.
- Rewriting `test.yml` to run in parallel jobs (matrix-style Stylelint + Vitest) — optimization without a measured need. Single sequential job is faster at this scale.
- Extending the canon to `--primary` / `--secondary` / `--accent` / `--muted` / `--card` / `--popover` / `--border` / `--ring` / `--input` / `--background` / `--foreground` — all already routed through HSL by convention but not guarded. Legitimate Step 2K (batch them all via `describe.each` with the same helper). Not bundled here; this step proves the pattern with the semantic-status family first.

## Prompt feedback

**What worked**: You named both enhancements with tight scoping ("same helper, same shape, three near-identical tests" and "complements (doesn't replace) the Husky hook"). That anti-scope-creep framing is why these plans stay small. Also, you've been maintaining step-number continuity (2E → 2F → 2G → 2H → 2I → 2J) which gives the work a clear spine.

**What could sharpen**: You asked for `.github/workflows/check.yml` as a new file, but a `test.yml` already exists. The plan above recommends extending `test.yml` instead. A tighter prompt would include one line asking the AI to verify adjacent files before creating new ones — e.g., *"If a CI workflow already exists, propose extending it vs. adding a new one and recommend."* Framing that as a standing preference (add it to project memory once) would save the round-trip on every CI-adjacent step.

**Better prompt framing for next wave**: Rather than two separate suggestions as a list, consider *"Extend canon to --success/--warning/--info AND wire the same gate to CI — one step, both halves land together or neither does."* Coupling them explicitly prevents the (common) failure mode where Part A ships, Part B gets deferred, and the CI gap lingers for weeks. You've actually been doing this implicitly by approving bundled plans; making it explicit in the prompt locks it in.

## Enhancement suggestions for next wave

1. **Step 2K — Batch the remaining shadcn tokens** (`--primary`, `--secondary`, `--accent`, `--muted`, `--card`, `--popover`, `--border`, `--ring`, `--input`, `--background`, `--foreground`) into the same parameterized test. Once added, any new theme that forgets to redefine a token fails the canon immediately. One-time 30-minute job; lifetime payoff.

2. **Add a branch-protection docs entry** at `docs/ci.md` (or in the repo README) documenting: (a) that `check` is the required status, (b) how to run it locally (`npm run check`), (c) the Husky hook's role, (d) how to override in emergencies (`git commit --no-verify`, followed by an immediate follow-up commit). Turns tribal knowledge into onboarding material. Three paragraphs, high contributor-time ROI.

