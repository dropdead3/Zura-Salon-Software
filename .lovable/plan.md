

# Step 2I — Commit-time gate, and the first non-scrollbar CSS-canon test

Two enhancements, same foundation. Part A makes the Stylelint + Vitest canon fail at commit time so nobody has to remember to run it. Part B finally gives `css-rule.ts` a second consumer — the scrollbar fixture shim can then be deleted, proving the Step 2G generalization was worth it.

**Priority read**: Part A is the must-have (authoring-time enforcement is the whole point of a canon). Part B is the proof-of-reuse that unblocks shim deletion.

## Part A — Husky + lint-staged pre-commit gate

**What ships**

1. `package.json` — add devDeps `husky`, `lint-staged`; add scripts `"prepare": "husky"` and `"check": "npm run lint:css && vitest run"`. (Composite `check` was deferred from Step 2H; include it now so the hook and manual runs share one target.)
2. `.husky/pre-commit` — one line: `npx lint-staged`.
3. `.lintstagedrc.json` — two globs:
   - `"src/**/*.css"`: `stylelint`
   - `"src/**/*.{ts,tsx}"`: `eslint --max-warnings=0`
   - Vitest runs via `check` (manual / CI), **not** in the commit hook — too slow for staged-file scope and the test suite isn't file-scoped yet. Hook stays under ~2s on realistic commits.

**Why lint-staged and not just the hook calling `npm run check`**
Lint-staged scopes to staged files only, so editing one component doesn't re-lint 800 CSS files. The hook stays fast enough that nobody feels tempted to `--no-verify`.

**Acceptance (Part A)**

1. Fresh clone + `npm install` auto-runs `husky` via the `prepare` script; `.husky/pre-commit` is executable.
2. Staging `src/index.css` with a raw `rgba(0,0,0,0.3)` in a non-token rule causes `git commit` to fail at the pre-commit hook.
3. Staging only `README.md` skips both linters (nothing matches the globs).
4. `npm run check` runs both gates manually and returns non-zero if either fails.
5. Hook completes in under 3s on a realistic 5-file commit.

## Part B — First non-scrollbar canon test: `destructive` routes through HSL

**What we're asserting**

Every CSS rule that uses the word `destructive` in a property value resolves through `hsl(var(--destructive))` or `hsl(var(--destructive-foreground))` — never a raw hex, raw `rgba`, or `red-*` Tailwind-color literal. The bug this catches: someone writes `color: #dc2626` or `background: red` for a "destructive red" surface, bypassing the theme and breaking all 13 theme palettes.

**Scope**

- `src/index.css` — today, `--destructive` appears only inside `:root` / `.dark` / theme-scope blocks (all 13 themes). No out-of-token usages exist. The test encodes this as a canon: **any future `destructive` reference outside a token-definition block must be through `hsl(var(--destructive*))`.**
- Not checked: `.tsx` files or `tailwind.config.ts`. Tailwind's `bg-destructive` / `text-destructive` utilities are already HSL-routed via the config; they're a separate surface with its own guarantees.

**Files**

1. `src/test/destructive-token.test.tsx` — new. Three assertions using the generalized `@/test/css-rule` primitives:
   - **Every `--destructive` declaration lives in a token-definition block** (`:root`, `.dark`, or a theme-scope selector like `[data-theme="..."]`). Parse `index.css`, find every line containing `--destructive:`, assert each is inside an allowed parent-selector context. Uses `extractAllRuleBodies` to cover multi-theme blocks.
   - **No raw hex or rgba literal appears on the same line as the word `destructive`** anywhere in `index.css`. Regex guard: `/destructive[^;]*#[0-9a-fA-F]/` and `/destructive[^;]*rgba?\(/` both return no matches. Catches someone writing `/* destructive */ color: #dc2626;`.
   - **Tailwind config routes `destructive` through HSL.** Read `tailwind.config.ts` as a string, assert the `destructive` block contains `hsl(var(--destructive))` and `hsl(var(--destructive-foreground))`. Catches a future config edit that hardcodes the color.

2. `src/test/scrollbar-tokens.fixtures.ts` — **delete**. With two consumers of `@/test/css-rule`, the shim has served its purpose. `src/test/scrollbar-tokens.test.tsx` migrates its import from `./scrollbar-tokens.fixtures` to `@/test/css-rule` (one-line change).

3. `src/test/scrollbar-tokens.test.tsx` — update the import path. No other changes.

**Why this test, specifically**
User picked `--destructive` in the original suggestion. It's the right choice because: (a) it's cross-cutting (every theme redefines it), (b) the failure mode is visible (red buttons turn invisible in half the themes), and (c) it proves the css-rule primitives handle both single-rule and multi-rule extraction.

**Acceptance (Part B)**

1. `npx vitest run src/test/destructive-token` passes on the current codebase.
2. Inserting `color: #dc2626; /* destructive */` into a new `.danger` rule causes the test to fail with a clear message.
3. Changing `tailwind.config.ts` `destructive.DEFAULT` from `"hsl(var(--destructive))"` to `"#dc2626"` causes the tailwind-config assertion to fail.
4. `src/test/scrollbar-tokens.fixtures.ts` is deleted; `scrollbar-tokens.test.tsx` imports from `@/test/css-rule`; both test suites still pass.
5. Combined canon test files (scrollbar + destructive) stay under 150 lines total — the helper does the heavy lifting, not the tests.

## Technical notes

- **Husky v9 syntax**: `.husky/pre-commit` is a plain shell script with no `husky.sh` sourcing (changed in v9). One line, one command.
- **`prepare` script timing**: `npm install` runs `prepare` automatically, so contributors get the hook with zero extra steps. The `prepare` script is a no-op on CI (`husky` detects `CI=true` and skips).
- **Why not put Vitest in the hook**: A failing test in an unrelated file would block an unrelated commit. Vitest lives in `check` (manual + CI); the hook is lint-only.
- **Shim deletion is safe now**: Step 2G kept the shim as a back-compat layer "until a second consumer exists." Part B creates that consumer, so the shim has no reason to live.
- **What I did NOT verify** (flagging honestly): I have not audited `.tsx` files for raw `#dc2626` / `red-600` usages. If the user wants that covered, it's a separate lint rule (ESLint custom, different plugin architecture) — Step 2J territory, not bundled here.

## Out of scope

- Wiring `npm run check` into CI (GitHub Actions / similar) — needs a `.yml` the project doesn't have yet; separate decision.
- Auditing `.tsx` files for hardcoded destructive colors — different tool (ESLint), different step.
- Expanding the destructive test to other semantic tokens (`--warning`, `--success`) — same pattern, easy follow-up, but scope creep here. Land the pattern first with one token.
- Running the hook against `.md` / config files — globs are deliberately narrow.

