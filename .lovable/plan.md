

## Goal
Three small hardening passes on the linter we just shipped:
1. **CI wiring** — confirm `bun test` (or equivalent) actually runs the new spec on push, so author drift fails the build, not just local runs.
2. **Package boundary** — extract `POLICY_LIBRARY_LINT_RULES` from the test file into `src/lib/policy/lint-rules.ts` so future consumers (admin badge, pre-seed CLI) can import without dragging in vitest.
3. **Reason-grouping smoke test** — a fast, mock-based unit test for the `hiddenByReason` memo logic so regressions in `applicabilityReason`'s service keys fail loudly.

## Investigation

### Gap 1: CI wiring — investigation needed
The lint suite passes locally but only matters if CI runs it. Need to check:
- Is there a `package.json` test script (`bun test` / `vitest`)?
- Is there a CI workflow file (`.github/workflows/*.yml`) running tests on push/PR?
- If neither exists, this is **not a code change** — it's a "you need to add CI" recommendation.

I'll inspect `package.json` and `.github/workflows/` during implementation. Three outcomes:

**Outcome A**: Test script + workflow already exist and pick up `src/__tests__/**` → no change needed; document the path in the doctrine.
**Outcome B**: Test script exists but no workflow → add a minimal `.github/workflows/test.yml` that runs `bun install` + `bun test` on push.
**Outcome C**: Neither exists → add both. Risky in a Lovable project (test infra may not be set up); will check first and ask the user only if vitest config is missing entirely.

The lint suite itself uses `supabase.from('policy_library').select(...)` against the live anon-keyed client. **In CI without env vars, it will fail to connect.** Two options to handle:
- **A**: Gate the suite with `describe.skipIf(!process.env.VITE_SUPABASE_URL)` — runs locally and on PR if secrets are wired, silently skips otherwise.
- **B**: Refactor the linter to take a `rows` array as input (pure function) and split into two tests: a pure-rules unit test (always runs) and an integration test (gated on env).

I recommend **B** — it makes the rule logic testable without DB access, and incidentally fulfills Gap 3's "make the rules importable for non-test consumers." Two birds.

### Gap 2: Package boundary extraction
The current location bundles rules with vitest imports. Extraction plan:
- New file: `src/lib/policy/lint-rules.ts`
  - Exports `LibraryRow` type (rename to `PolicyLibraryRow`)
  - Exports `PolicyLintRule` interface
  - Exports `POLICY_LIBRARY_LINT_RULES` array
  - Exports a pure helper: `runPolicyLibraryLint(rows: PolicyLibraryRow[]): { failures: string[] }`
- Test file (`src/__tests__/policy-library-content.test.ts`) becomes thin:
  - Imports rules + helper from `@/lib/policy/lint-rules`
  - One test fetches from Supabase and runs the helper
  - One test (new) provides synthetic rows covering each rule's pass + fail path — runs without DB

Future consumers (admin dev badge, pre-seed CLI) just import the helper. No vitest baggage.

### Gap 3: byReason memo smoke test
The `hiddenByReason` memo lives in `src/pages/dashboard/admin/Policies.tsx`. Two ways to test it:
- **A**: Extract the memo logic into a pure function (`computeHiddenByReason(library, profile)`) in `src/lib/policy/applicability-summary.ts`, then test that function with mock inputs. Component just calls it.
- **B**: Render the page in a test with mocked hooks and assert the rendered breakdown copy.

**A** is cleaner — the function becomes reusable (Command Center could call it later for an "applicability summary" tile), and the test runs in milliseconds without React infra.

Test cases:
1. 3 entries hidden across 2 services (e.g., 2 extensions + 1 minors) → returns `{ extensions: { count: 2, label: 'extensions' }, minors: { count: 1, label: 'minors (under 18)' } }`.
2. All entries applicable → returns `{}`.
3. Profile null → returns `{}` (silence over wrong number, matches existing contract).
4. Single-reason hiding → returns one key (lets the JSX drop the colon segment).

Locks the `applicabilityReason().service` key contract — if someone renames `'minors'` to `'underage'` without updating the doctrine, this test fails.

## Changes

### Change A: Extract pure rules + helper
**New file**: `src/lib/policy/lint-rules.ts`
- Move `PolicyLibraryRow`, `PolicyLintRule`, `POLICY_LIBRARY_LINT_RULES` here.
- Add `runPolicyLibraryLint(rows): { failures: string[] }` pure helper.

**File edit**: `src/__tests__/policy-library-content.test.ts`
- Import everything from `@/lib/policy/lint-rules`.
- Add a new `describe('rule logic — pure')` block with synthetic-row tests that exercise each rule's pass and fail path (no DB).
- Keep the existing live-DB test, but wrap with `describe.skipIf(!import.meta.env.VITE_SUPABASE_URL)` so it skips silently in environments without Supabase config.

### Change B: Extract `hiddenByReason` to pure function + test
**New file**: `src/lib/policy/applicability-summary.ts`
- Export `computeHiddenByReason(library, profile): Record<string, { count: number; label: string }>`.
- Pulls service/label from existing `applicabilityReason`.

**File edit**: `src/pages/dashboard/admin/Policies.tsx`
- Replace the inline `hiddenByReason` reduction with a call to the new helper. Same memo signature, same render output.

**New file**: `src/__tests__/policy-applicability-summary.test.ts`
- 4 cases listed in Gap 3 investigation above.
- Pure JS — no React, no DB, no mocks beyond plain objects.

### Change C: CI workflow (conditional)
- First inspect `package.json` and `.github/workflows/`.
- If a workflow already runs `bun test` / `vitest`, no change — document the test path in the doctrine.
- If a test script exists but no workflow, add `.github/workflows/test.yml`:
  ```yaml
  name: Test
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: oven-sh/setup-bun@v1
        - run: bun install
        - run: bun test
  ```
- If no test script exists, add `"test": "vitest run"` to `package.json` scripts (vitest is already imported by the existing test file, so it must be installed).
- The live-DB integration test will skip in CI (no env vars) — only pure rule tests + summary tests run. Authoring drift in pure rules still fails CI; live drift only fails locally with creds. Acceptable.

### Change D: Doctrine update
**File edit**: `mem://features/policy-os-applicability-doctrine.md`
- Note that lint rules now live at `src/lib/policy/lint-rules.ts` (not in the test file).
- Note that applicability-summary helpers live at `src/lib/policy/applicability-summary.ts`.
- Reaffirm the four-place paired-shipping rule (profile column + library column + applicability branch + lint rule) — locations now precise.

## Out of scope
- Admin-side dev badge consuming the rules (designed-for, not built this wave).
- Pre-seed CLI (same — file structure now supports it).
- Rendering the lint failures inline on the Policies page in dev mode.
- Snapshot tests for the JSX banner copy (the smoke test on the underlying memo is sufficient).

## Files touched
- `src/lib/policy/lint-rules.ts` — new, pure rule table + runner
- `src/lib/policy/applicability-summary.ts` — new, `computeHiddenByReason` helper
- `src/__tests__/policy-library-content.test.ts` — slim down to imports + add pure-rule tests + skipIf guard
- `src/__tests__/policy-applicability-summary.test.ts` — new, 4 smoke cases
- `src/pages/dashboard/admin/Policies.tsx` — swap inline reduce for helper call
- `package.json` — add `test` script if missing (conditional)
- `.github/workflows/test.yml` — add if missing (conditional)
- `mem://features/policy-os-applicability-doctrine.md` — file-path precision update

## Sequencing
1. **A** — extract rules to `src/lib/policy/lint-rules.ts`, add pure tests, gate live test. Highest leverage; unblocks future consumers.
2. **B** — extract `hiddenByReason`, add summary spec. Fast safety net.
3. **C** — inspect CI infra; add only what's missing. May be a no-op.
4. **D** — doctrine close.

