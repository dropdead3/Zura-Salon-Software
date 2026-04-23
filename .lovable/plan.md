

# Step 2H — Wire the canon into the default check gate, and extend it to raw hex

Two enhancements, both extending the Step 2G foundation. Part A closes the "easy to forget" loophole by routing Stylelint through the same gate Vitest uses. Part B broadens the ban from `rgba(` to the full raw-color family (`rgb(`, `rgba(`, raw hex) — same regression class, same plugin, one expanded matcher.

## Part A — Route Stylelint through the default check gate

**The gap**
`npm run lint:css` exists but no one runs it. CI doesn't run it. The Vitest suite doesn't run it. It's a flashlight that lives in a drawer.

**The fix**
Add a composite `"check"` script that runs both Vitest and Stylelint, and wire the existing test script (or the `check` umbrella) to call it. Whichever the team already treats as the "green bar" command now fails if a raw `rgba` slips into `index.css`.

**Files**

1. `package.json` — two script additions:
   - `"lint:css": "stylelint 'src/**/*.css'"` (already present from Step 2G).
   - `"check": "npm run lint:css && npx vitest run"` — new. Single composite command that the team (and any future pre-commit or CI hook) can call.
   - If `"test"` currently just runs Vitest, leave it alone — `check` is the strict gate, `test` stays fast for iteration.

**Why a composite `check` script and not overloading `test`?**
Vitest-only runs are the fast iteration loop (watch mode, single-file filter). `check` is the strict pre-flight: both gates must pass. Two commands, two purposes, no overloading.

**Acceptance (Part A)**

1. `npm run check` runs Stylelint first, then Vitest, and returns non-zero if either fails.
2. Inserting `color: rgba(0, 0, 0, 0.3);` into a non-token rule in `src/index.css` causes `npm run check` to fail at the Stylelint step before Vitest runs.
3. `npm run test` still runs Vitest only (unchanged fast loop).
4. Stylelint runtime on the full `src/**/*.css` glob stays under 3s (measured during Step 2G).

## Part B — Extend the plugin to raw hex

**The gap**
The current rule name is `zura/no-raw-rgba-outside-tokens`. It catches `rgb(` and `rgba(` with literal integer args. It does **not** catch:
- `#fff`, `#000`, `#ffffff`, `#00000080` (3/4/6/8-digit hex).
- Hex with uppercase letters (`#FFF`, `#ABC123`).

Same regression class (theme-blind literal), same fix (`hsl(var(--token) / alpha)`), same escape hatch (`/* intentional literal: <reason> */`).

**The fix — extend, don't duplicate**

Keep the plugin file and rule name (the ecosystem already references it), but broaden the matcher and rename the rule to reflect the wider scope.

**Files**

1. `tools/stylelint-plugins/no-raw-rgba-outside-tokens.cjs` — rename the exported rule to `zura/no-raw-colors-outside-tokens` (more accurate) and extend `LITERAL_RE`:
   ```js
   const LITERAL_RE = /(\brgba?\(\s*\d)|(#[0-9a-fA-F]{3,8}\b)/;
   ```
   The rest of the plugin (parent-selector check, preceding-comment escape hatch) is unchanged — it's declaration-level logic that doesn't care which literal triggered the match. Update the reported message to:
   > `"Raw color literal (rgb/rgba/hex) outside token definition. Use hsl(var(--token) / alpha) or annotate with /* intentional literal: <reason> */ above this line."`

2. `.stylelintrc.cjs` — update the rule key from `"zura/no-raw-rgba-outside-tokens": true` to `"zura/no-raw-colors-outside-tokens": true`. Single-line swap.

3. **No changes to `src/index.css`** until we run the rule and see what fails. Expected outcomes:
   - **Token definitions** in `:root` / `.dark` — exempt by selector, no changes.
   - **Hex inside `intentional literal` blocks** (Step 2F annotations for `zura-disco`, `mkt-glass`) — already allowed by the escape-hatch check.
   - **New violations** — handled case-by-case with the same three-bucket categorization from Step 2F (fix / annotate / delete). Most likely candidates: shadow utilities, gradient stops, debug outlines.

**Why extend the same plugin instead of adding a second one?**
The logic is identical — parent-selector check and preceding-comment check are the canon, not the matcher. One plugin, one rule, one matcher regex. Adding a second plugin would duplicate the 40 lines of context-walking code.

**Why a regex that also catches hex inside `url(#gradient-id)` or SVG ID refs?**
It won't in practice — `#gradient-id` isn't hex (letters beyond `a-f`). The `\b` word boundary and the 3–8 digit constraint keep SVG fragment IDs out of scope. If any false positive surfaces during the audit pass, it gets an `/* intentional literal: SVG fragment reference */` annotation and we move on.

**Acceptance (Part B)**

1. `npx stylelint 'src/**/*.css'` passes after the audit pass.
2. Inserting `background: #000;` into a non-token, non-annotated rule fails with the documented message.
3. Inserting the same line preceded by `/* intentional literal: true-black scrim */` passes.
4. Inserting `background: #000;` inside `:root` or `.dark` passes (token definitions).
5. The rule still catches all Step 2G cases (`rgba(0, 0, 0, 0.3)` in a non-token rule).
6. SVG `url(#...)` references in CSS `background-image` values do not trigger false positives (or are annotated if they do).

## Technical notes

- **Rule rename is a breaking change to `.stylelintrc.cjs`** but nothing else references the old key. Single-config-line edit.
- **Expected audit scope** — `git grep -nE '#[0-9a-fA-F]{3,8}\b' src/index.css` outside `:root` / `.dark` will surface the real list. Could be zero (if the codebase has been disciplined about hex), could be a handful. Plan covers the pattern, not a pre-written diff.
- **The `check` script is the lever that makes all of this real.** Without it, Stylelint is the same flashlight-in-a-drawer. With it, the canon fails the same gate tests fail.

## Out of scope

- Wiring `npm run check` into a pre-commit hook or CI pipeline — that's a separate decision the user makes when they're ready to enforce beyond local runs.
- Extending to `hsl(` literals (`hsl(210, 20%, 50%)` without a token) — different regression shape (not theme-blind, just un-tokenized); likely Step 2I if ever needed.
- Extending to `.tsx` inline styles or `styled-components` — the project doesn't use either.
- Deleting the `scrollbar-tokens.fixtures.ts` shim — still no second consumer of `src/test/css-rule.ts`; keep the shim until one exists.

