

# Step 2T + 2U — Allowlist hygiene audit, and post-package.json doc sync

Two cleanup steps. Part A audits the structural categorization in the cross-theme parity canon and graduates `--mesh-gradient` to a first-class token. Part B is the doc sync that closes Step 2S once `package.json` lands in a real PR.

## Part A — Allowlist hygiene audit (Step 2T)

**The audit, by category**

Three structural collections live in `src/test/cross-theme-parity-canon.test.tsx`. Each gets a one-line verdict:

1. **`BASELINE_ONLY_TOKENS`** (typography + radius — 27 entries) — **Keep as-is.** These are theme-invariant by intent (themes change color, not type scale). Zero churn.

2. **`STRUCTURAL_NON_THEME_SELECTORS`** (`:root`, `.dark` — 2 entries) — **Keep as-is.** Both are primitive plumbing, not color themes. Zero churn.

3. **`DECORATIVE_OPTIONAL_TOKENS`** (`mesh-gradient` — 1 entry) — **Graduate `--mesh-gradient` to a first-class baseline token.** Pre-flight evidence: defined in all 11 light themes (`html.theme-zura` through `html.theme-orchid`) plus all dark variants. It's universal, not optional. Treating it as "optional" means a future theme could silently omit it and the canon would stay green — exactly the regression class 2R was built to catch.

**The change**

Move `mesh-gradient` from `DECORATIVE_OPTIONAL_TOKENS` to a new `BASELINE_THEME_GRADIENT_TOKENS` set (or merge into baseline-color-token tracking). Then resolve the structural mismatch: `--mesh-gradient` is currently defined in `html.theme-*` selectors (with the `html.` prefix), not in plain `.theme-*` blocks. The parity canon iterates `.theme-bone` as baseline, but `--mesh-gradient` lives in `html.theme-bone`.

Two options to handle this:

- **Option A (preferred)**: Update `extractThemeSelectors` in `src/test/css-rule.ts` to also recognize `html.theme-*` selectors, and have the parity canon treat `html.theme-bone` + `.theme-bone` as a unified baseline (merge their token sets). This matches runtime: both selectors apply to the same `<html>` element with `class="theme-bone"`. Then `--mesh-gradient` becomes part of the baseline color surface and parity is enforced across all 11 themes automatically.

- **Option B (fallback if A is too invasive)**: Keep `mesh-gradient` in `DECORATIVE_OPTIONAL_TOKENS` but rename the set to `THEME_GRADIENT_TOKENS` and add a *separate* targeted parity assertion ("every `html.theme-*` block defines `--mesh-gradient`"). Smaller blast radius, less elegant.

Plan commits to **Option A** — the helper extension is ~5 lines and the merge is ~3 lines in the test. The result: one less special-case set, one more enforced token.

**File-by-file**

- **Modify `src/test/css-rule.ts`**: Extend `extractThemeSelectors` regex to match `html.theme-*` and `html.dark.theme-*`. The selectors get returned alongside `.theme-*`.
- **Modify `src/test/cross-theme-parity-canon.test.tsx`**: 
  - Remove `mesh-gradient` from `DECORATIVE_OPTIONAL_TOKENS` (the set becomes empty; remove it entirely along with its filter logic).
  - Add a small "merge co-applied selectors" step: when computing baseline tokens for `.theme-bone`, also union in tokens from `html.theme-bone`. Same merge for each theme during parity check.
  - Update file header comment to reflect that gradient tokens are now first-class, not optional.

**Acceptance (Part A)**

1. `bun run test src/test/cross-theme-parity-canon` passes on current codebase (all 11 themes already define `--mesh-gradient`).
2. Deleting `--mesh-gradient` from any single `html.theme-*` block fails the parity canon with that theme named in the failure.
3. The `DECORATIVE_OPTIONAL_TOKENS` constant is removed from the file.
4. `extractThemeSelectors` exported behavior change documented in its JSDoc.

## Part B — Doc sync after `package.json` lands (Step 2U)

**Trigger condition** (deliberately stated): This step only ships *after* a real PR applies the `package.json` edits from `docs/ci.md` Step 2S manual actions section. If `package.json` hasn't been updated, the doc sync is premature and the caveats stay accurate.

**Pre-flight check at start of implementation**: Read `package.json`. If `scripts.check`, `scripts.lint:css`, `scripts.prepare`, `lint-staged` config, and `husky` + `lint-staged` devDependencies are all present → proceed. If not → halt and surface the gap; do not strip caveats from docs that would then be wrong.

**The edits (assuming `package.json` is ready)**

`docs/ci.md` changes, ~6 lines total:

1. **Line 28** — Drop the entire "targeted CSS lint" bullet, replace with cleaner alternative:
   ```
   - `npm run lint:css` — targeted CSS lint when iterating on tokens.
   ```
   (Was using `bunx stylelint` directly, now use the wired script.)

2. **Lines 30–31** — Remove the entire caveat paragraph:
   > The `check` script requires the `package.json` edits listed at the bottom of this file (Step 2S manual actions) — once those land, `check` is real.

3. **Line 35** — Soften the Husky reference:
   ```
   On every commit, a pre-commit hook runs **lint-staged** against staged files only:
   ```
   (Was: "Once Husky is installed (via the `prepare` script on `npm install`), a pre-commit hook…")

4. **Lines 77–107** (entire "Step 2S manual actions" section) — Delete. The section's purpose was a checklist for the not-yet-applied edits. Once applied, the section is dead weight.

5. **Optional cleanup**: Add a one-line "Step 2S — landed" entry to a future "Changelog / canon history" section if one exists. Skip if not (don't create a new section just for one entry).

**Acceptance (Part B)**

1. `docs/ci.md` "Running locally" reads as if `npm run check` always worked — no temporal caveats.
2. No reference to "package.json edits required" remains anywhere in the file.
3. Husky pre-commit description reads as a present-tense fact, not a conditional.
4. Word count drops by ~30 lines (removal of Step 2S section).

## Combined acceptance

1. `bun run test src/test/cross-theme-parity-canon` passes — `--mesh-gradient` now enforced across 11 themes.
2. `DECORATIVE_OPTIONAL_TOKENS` set deleted from `cross-theme-parity-canon.test.tsx`.
3. `extractThemeSelectors` recognizes `html.theme-*` selectors.
4. `docs/ci.md` Step 2S section deleted; all "requires package.json edits" caveats removed.
5. No file exceeds ~130 lines.

## Files

- **Modify**: `src/test/css-rule.ts` (regex extension in `extractThemeSelectors`)
- **Modify**: `src/test/cross-theme-parity-canon.test.tsx` (drop optional set, merge co-applied selectors)
- **Modify**: `docs/ci.md` (drop caveats, delete Step 2S section)

## Technical notes

- **The `html.theme-*` vs `.theme-*` distinction is a real CSS specificity choice**, not a bug. `html.theme-bone` is more specific than `.theme-bone`, which lets gradient tokens sit at a higher cascade tier without affecting color tokens. The canon needs to model this: same theme, two selectors, one merged token surface.
- **Why graduate `--mesh-gradient` instead of asserting it separately**: parsimony. Two assertions with two selectors is harder to reason about than one assertion against a merged baseline. The merge is the right abstraction because runtime *is* a merge.
- **Why Step 2T audits all three categories not just one**: the doctrine here is "graveyards rot." Auditing only the suspicious entry teaches future contributors that the others are sacred. Touching all three (even just to confirm "keep") signals that they're all subject to scrutiny.
- **Why Step 2U has a pre-flight check**: the doc sync's entire premise is that `package.json` was edited. Stripping caveats before that's true would create the worst doc state — confidently wrong instead of accurately conditional.

## Out of scope

- **Asserting that `html.dark.theme-*` selectors define the same gradient tokens as `html.theme-*`** — light/dark gradient parity is a separate canon (cross-mode parity, not cross-theme). Worth a future step if regressions appear; not bundled here.
- **Migrating from `html.theme-*` to plain `.theme-*` for gradients** — would simplify the canon but changes runtime CSS specificity. Out of scope; the canon adapts to the codebase, not the other way around.
- **Changing how `BASELINE_ONLY_TOKENS` is structured** (e.g., splitting typography from radius) — confirmed accurate; no change needed.
- **Adding a "canon history" section to `docs/ci.md`** — would be valuable but is its own step. The current scope is removing stale conditionals, not adding new structure.
- **Re-evaluating whether `:root` should be the baseline instead of `.theme-bone`** — already decided in Step 2R; revisiting now would be churn.

## Prompt feedback

**What worked**: You correctly identified that an empty `ALLOWLIST_OMISSIONS` is fine but the *adjacent* structural categories are where the real audit value lives. Naming the specific candidate (`--mesh-gradient`) with the specific test (used everywhere?) made the prompt a hypothesis, not just a vague "look at these." That's the right shape for a low-cost audit.

**What could sharpen**: For 2U you wrote "two-line edit" — accurate for the caveat-removal lines, but understates the Step 2S section deletion (~30 lines). A tighter framing: *"two caveat removals plus deleting the Step 2S manual-actions section."* Naming the section deletion explicitly avoids the trap of stripping caveats but leaving the now-obsolete instruction block in place.

**Better prompt framing for next wave**: For doc-sync steps, always pair the "what to remove" with "and the section that was justifying its existence." Otherwise the docs get a halfway state — caveats gone, but the explainer block they pointed to still present, leaving future readers asking "wait, what was this section for?"

## Enhancement suggestions for next wave

1. **Step 2V — Light/dark gradient parity canon.** Once 2T graduates `--mesh-gradient` to a first-class token, the symmetric question is: does every theme that defines it in `html.theme-*` also define it in `html.dark.theme-*`? Currently true by inspection; a canon makes it permanent. ~20 lines, builds directly on the merged-selector logic from 2T.

2. **Step 2W — Canon history section in `docs/ci.md`.** With Steps 2I→2T accumulated, a one-paragraph-per-step "Canon history" appendix would let contributors trace why each rule exists without grepping commit history. The `mem://architecture/canon-pattern.md` memory has the abstract pattern; the history section grounds it in this repo's specific decisions. ~50 lines, high-leverage onboarding artifact.

