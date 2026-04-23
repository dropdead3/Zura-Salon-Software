

# Step 2G — Lock the rgba-literal canon with a lint rule, and generalize the CSS rule fixture

Two enhancements, same spirit as Step 2F: **make the canon enforceable at authoring time, not just at test time.** The Vitest suite catches regressions in two named utilities; a stylelint rule catches them in any utility, the moment they're typed.

## Part A — Stylelint rule banning `rgba(` outside token definitions

**What we're protecting**
Every `rgba(0, 0, 0, …)` or `rgba(255, 255, 255, …)` in `src/index.css` that lives outside a token definition block is a theme-blind literal. Step 2E fixed three. Step 2F annotated the intentional ones (`zura-disco`, `mkt-glass`). A lint rule locks the door.

**Approach — add Stylelint, minimal config, one custom plugin**

The project has no Stylelint today (only ESLint for JS/TS — see `eslint.config.js`). We'll add it narrowly, scoped to `src/index.css` only, with one rule that matters.

**Files**

1. `package.json` — add devDependencies: `stylelint`, `stylelint-config-standard`, plus a script `"lint:css": "stylelint 'src/**/*.css'"`.
2. `.stylelintrc.cjs` — config extending `stylelint-config-standard` but relaxing rules that fight Tailwind (`at-rule-no-unknown` off for `@tailwind`, `@apply`, `@layer`, `@screen`; `no-descending-specificity` off; `selector-class-pattern` off for our kebab-case utilities). Register our custom plugin.
3. `tools/stylelint-plugins/no-raw-rgba-outside-tokens.cjs` — custom rule. Logic:
   - Walk every `Declaration` node.
   - If the value contains `rgba(` or `rgb(` with literal integer args (not `var(--…)`):
     - Walk up to the parent rule.
     - If the parent selector is `:root` or `.dark` (or any selector starting with `:root` / `.dark `), allow it — those are token definitions.
     - If the declaration is preceded by a comment containing `intentional literal` (case-insensitive), allow it — this is the Step 2F escape hatch (`zura-disco`, `mkt-glass`).
     - Otherwise, report with message: `"Raw rgba/rgb literal outside token definition. Use hsl(var(--token) / alpha) or annotate with /* intentional literal: <reason> */ above this line."`
   - Rule name: `zura/no-raw-rgba-outside-tokens`. Severity configurable; we ship it as `error`.

**Acceptance (Part A)**

1. `npm run lint:css` passes on the current `src/index.css` (the Step 2F annotations are respected).
2. Inserting `color: rgba(0, 0, 0, 0.3);` into a new `.foo` rule fails lint with the documented message.
3. The same insertion preceded by `/* intentional literal: true-black scrim per design */` passes.
4. Adding the same rule inside `:root` or `.dark` passes (token definitions are the canon's source).
5. Lint runs in under 2 seconds on the current `index.css`.
6. Existing `rgba` literals inside `:root` and `.dark` (the token definitions themselves) are untouched — they're the whole point of having the rule.

## Part B — Generalize the CSS rule fixture into `src/test/css-rule.ts`

**What we're generalizing**
`src/test/scrollbar-tokens.fixtures.ts` contains `extractRuleBody(cssSource, selector)` and `readIndexCss()`. Both are useful beyond scrollbars the moment we write any other CSS-canon test (the user's example: "all `--destructive` usages route through HSL", but the same shape applies to elevation shadows, focus rings, glass surfaces, etc.).

**Approach — promote, don't duplicate**

1. **Create** `src/test/css-rule.ts` with the primitives:
   - `extractRuleBody(cssSource: string, selector: string): string | null` — moved as-is.
   - `readCssFile(relativePath: string): string` — generalized from `readIndexCss`. Takes a path relative to `src/`, reads once, caches by path (Map-based cache so multiple files can be tested in one run).
   - `readIndexCss(): string` — kept as a thin convenience wrapper over `readCssFile("index.css")` so nothing downstream breaks.
   - Also add `extractAllRuleBodies(cssSource, selector): string[]` — plural variant for cases where the same selector appears in multiple `@media` / `@layer` contexts. Not strictly needed today but one extra line and avoids a re-refactor next time.

2. **Rewrite** `src/test/scrollbar-tokens.fixtures.ts` as a two-line re-export for back-compat:
   ```ts
   // Deprecated: prefer src/test/css-rule.ts. Kept as re-export to avoid touching existing tests.
   export { extractRuleBody, readIndexCss } from "./css-rule";
   ```
   This keeps `src/test/scrollbar-tokens.test.tsx` working with zero edits.

3. **No changes** to `scrollbar-tokens.test.tsx` — its imports continue to resolve via the re-export. When the next CSS-canon test is written, it imports directly from `@/test/css-rule` and we can eventually delete the shim.

**Acceptance (Part B)**

1. `npx vitest run src/test/scrollbar-tokens` still passes with zero test-file edits.
2. `src/test/css-rule.ts` exports `extractRuleBody`, `extractAllRuleBodies`, `readCssFile`, `readIndexCss`.
3. `readCssFile` caches per-path (calling it twice with the same path reads disk once; a different path reads disk a second time).
4. The back-compat shim in `scrollbar-tokens.fixtures.ts` is ≤5 lines and re-exports only.

## Technical notes

- **Why Stylelint and not an ESLint rule on template literals?** `index.css` is CSS, not TS. ESLint can't parse it without a CSS parser plugin; Stylelint is the native tool. Scoping it to `src/**/*.css` keeps it from stepping on the existing ESLint setup.
- **Why a custom plugin vs. `declaration-property-value-disallowed-list`?** The built-in allow/disallow rules can't do "allow only inside `:root` / `.dark`, or when annotated." The logic is context-dependent; a 40-line custom rule is the right tool.
- **CI**: not wired here — the user's preference has been "Vitest + npm script, no CI infra changes" (per Step 2F). `lint:css` is available as a script; wiring it into a pre-commit or CI gate is a separate decision the user can call when ready.
- **Escape-hatch convention**: `/* intentional literal: <reason> */` must be on the line immediately above the offending declaration. Matching the exact comment text we already use in Step 2F keeps the convention single-sourced.

## Out of scope

- Running lint in CI or a pre-commit hook (wire it when the user decides).
- Expanding the rule to cover raw hex (`#fff`, `#000`) — different regression class, Step 2H if we ever see it.
- Adding Stylelint to any file other than `src/**/*.css` (no `.tsx` inline styles, no `styled-components` — would be scope creep).
- Deleting the `scrollbar-tokens.fixtures.ts` shim now — free to remove once a second consumer exists, not before.
- Writing the "all `--destructive` uses route through HSL" test — that's the *reason* we generalize, not part of this step.

