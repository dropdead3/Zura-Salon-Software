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

- `bun run test` — fast Vitest iteration.
- `bunx stylelint "src/**/*.css"` — targeted CSS lint.
- `npm run check` — runs both in sequence once the `check` script is added to
  `package.json` (see the Step 2I manual-action list).

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
