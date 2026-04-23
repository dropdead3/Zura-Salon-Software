# CI Gate — `check`

The `check` gate enforces the CSS and design-token canon at merge time. It runs
on every pull request and on pushes to `main` via
[`.github/workflows/test.yml`](../.github/workflows/test.yml). If `check` fails,
the PR cannot merge (once branch protection is configured — see bottom of file).

## What runs

The gate runs two tools in sequence, fail-fast:

1. **Stylelint** against `src/**/*.css`. The canonical rule is
   [`tools/stylelint-plugins/no-raw-rgba-outside-tokens.cjs`](../tools/stylelint-plugins/no-raw-rgba-outside-tokens.cjs):
   no raw `rgba(...)` / `#hex` literals outside `:root`, `.dark`, `.theme-*`,
   or `[data-theme]` blocks. Raw colors bypass the theme system and break at
   least one palette.
2. **Vitest** (`bun run test`) runs the full test suite. The two CSS-canon
   tests are
   [`src/test/semantic-token-canon.test.tsx`](../src/test/semantic-token-canon.test.tsx)
   (every shadcn cross-cutting token routes through `hsl(var(--token))`) and
   the scrollbar-token fixture suite.

## Running locally

- `npm run check` — runs Stylelint → ESLint → Vitest in sequence, fail-fast.
  This is the unified gate; CI runs the same chain.
- `bun run test` — fast Vitest iteration during development.
- `bunx stylelint "src/**/*.css"` — targeted CSS lint when iterating on tokens.

The `check` script requires the `package.json` edits listed at the bottom of
this file (Step 2S manual actions) — once those land, `check` is real.

## Pre-commit hook (Husky + lint-staged)

Once Husky is installed (via the `prepare` script on `npm install`), a
pre-commit hook runs **lint-staged** against staged files only:

- `*.css` → Stylelint
- `*.{ts,tsx}` → ESLint

Vitest is deliberately **not** in the hook — a failing test on an unrelated
file would block commits to files the contributor didn't touch, which teaches
contributors to bypass the hook. CI catches those cases at PR time instead.

After a fresh clone, run `npm install` once to register the hook.

## Emergency override

`git commit --no-verify` bypasses the pre-commit hook. Rules of use:

1. Only when the hook is blocking an urgent fix AND the blocked check is
   known-safe (you've inspected the failure and it's unrelated or expected).
2. Immediately follow up with a separate commit that fixes the skipped check.
3. **CI will still catch it** — `--no-verify` is a delay, not an escape. Pushing
   a `--no-verify` commit to a PR will still fail the `check` workflow and
   block merge.

There is no contributor-facing way to bypass CI. If you need a force-merge,
that's a repo-admin capability covered in the internal runbook.

## Adding a new canon

- **New semantic token to guard** → extend the `TOKENS` array in
  [`src/test/semantic-token-canon.test.tsx`](../src/test/semantic-token-canon.test.tsx).
  The parameterized assertions handle the rest; missing tokens skip cleanly.
- **New CSS-level rule** → add a plugin to
  [`tools/stylelint-plugins/`](../tools/stylelint-plugins/) and register it in
  [`.stylelintrc.cjs`](../.stylelintrc.cjs).
- **New CI step** → add it to `.github/workflows/test.yml` under the existing
  `check` job. Keep it fail-fast (lint before tests).

## Branch protection (repo admin, one-time)

In GitHub repo settings → Branches → `main`, add `check` to required status
checks. Until this is configured, the gate reports but does not block merge.

## Step 2S manual actions (package.json edits)

> **Bundled PR checklist**: When the `package.json` edits below land, the
> same PR should also delete this entire section, plus:
> - Drop the "The `check` script requires…" caveat paragraph in *Running
>   locally* (currently lines 30–31).
> - Replace `bunx stylelint "src/**/*.css"` with `npm run lint:css` in the
>   *Running locally* bullet list (currently line 28).
> - Soften the Husky pre-commit intro from "Once Husky is installed (via the
>   `prepare` script on `npm install`), a pre-commit hook…" to "On every
>   commit, a pre-commit hook runs **lint-staged** against staged files
>   only:" (currently line 35).
>
> Do **not** strip those caveats without applying the `package.json` edits —
> the docs would become confidently wrong instead of accurately conditional.

`package.json` is read-only in the Lovable sandbox. To complete the local
`npm run check` loop, apply these edits in your local checkout / PR:

1. Add scripts:
   ```json
   "scripts": {
     "lint:css": "stylelint \"src/**/*.css\"",
     "check": "npm run lint:css && npm run lint && vitest run",
     "prepare": "husky"
   }
   ```

2. Add lint-staged config:
   ```json
   "lint-staged": {
     "*.css": "stylelint",
     "*.{ts,tsx}": "eslint --max-warnings=0"
   }
   ```

3. Add devDependencies:
   ```bash
   npm install --save-dev husky lint-staged
   ```

4. After `npm install`, the `prepare` hook auto-registers `.husky/pre-commit`
   (already present in this repo) so staged-file linting runs on every commit.

CI is already updated to run the same `lint:css → lint → test` chain.
