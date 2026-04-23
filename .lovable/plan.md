

# Step 2V + 2W — Cross-mode gradient parity, and Step 2S/2U bundling

Two enhancements. Part A adds the symmetric (light↔dark) gradient parity canon. Part B reframes 2W honestly: package.json is sandbox-read-only, so the "single PR bundle" must be split into a sandbox half (docs ready-to-strip) and a manual half (the package.json apply), with a clear handoff.

## Part A — Cross-mode gradient parity canon (Step 2V)

**The invariant**: For every theme name `X`, if `html.theme-X` defines `--mesh-gradient`, then `html.dark.theme-X` must also define `--mesh-gradient`. Symmetric to 2T (cross-theme parity for gradients), but on the light↔dark axis instead of the cross-theme axis.

**Pre-flight evidence**: All 12 themes (`zura`, `bone`, `rosewood`, `sage`, `jade`, `marine`, `cognac`, `noir`, `neon`, `matrix`, `peach`, `orchid`) have both `html.theme-X` and `html.dark.theme-X` blocks at lines 3019–3107 and 3117–3205. Canon will pass on first run; failure mode is a future theme adding a light gradient without a dark companion.

**New test file**: `src/test/cross-mode-gradient-parity-canon.test.tsx` (~40 lines)

Shape:

```ts
const GRADIENT_TOKEN = "mesh-gradient";
const ALLOWLIST_DARK_OMISSIONS: Record<string, string[]> = {
  // Per-theme intentional dark omissions (e.g., a hypothetical OLED-pure theme
  // that intentionally has no dark gradient). Empty by default.
};

const lightSelectors = extractThemeSelectors(indexCss)
  .filter(s => s.startsWith("html.theme-"));

for (const lightSel of lightSelectors) {
  const themeName = lightSel.slice("html.theme-".length);
  const darkSel = `html.dark.theme-${themeName}`;
  describe(`cross-mode gradient parity: ${themeName}`, () => {
    const lightTokens = new Set(extractDefinedTokens(extractRuleBody(indexCss, lightSel) ?? ""));
    if (!lightTokens.has(GRADIENT_TOKEN)) return; // light has no gradient → no symmetry required

    const darkBody = extractRuleBody(indexCss, darkSel);
    const darkTokens = new Set(extractDefinedTokens(darkBody ?? ""));
    const allowed = new Set(ALLOWLIST_DARK_OMISSIONS[darkSel] ?? []);

    it(`html.dark.theme-${themeName} defines --${GRADIENT_TOKEN} (or is allowlisted)`, () => {
      const omitted = !darkTokens.has(GRADIENT_TOKEN) && !allowed.has(GRADIENT_TOKEN);
      expect(omitted, `${darkSel} missing --${GRADIENT_TOKEN} (light variant defines it)`).toBe(false);
    });
  });
}
```

**Why a separate test file, not a new family in cross-theme-parity-canon**: different axis (light↔dark within a theme vs. theme-vs-baseline across themes). Bundling them would mean one test file with two unrelated invariants — readers would have to disambiguate which assertion is failing. Separate files = separate failure messages = clearer signal.

**Why parameterize on the gradient token only, not all tokens**: dark-mode color tokens already get parity from Step 2R via `STRUCTURAL_NON_THEME_SELECTORS` and the `.dark` baseline. The cross-mode gap is *specifically* gradients, because gradients live in the `html.theme-*` / `html.dark.theme-*` selectors that 2R deliberately excludes. Scope = the actual gap.

**Acceptance (Part A)**

1. `bun run test src/test/cross-mode-gradient-parity-canon` passes on current codebase (12 themes × 1 token = 12 assertions, all pass).
2. Deleting `--mesh-gradient` from any single `html.dark.theme-*` block fails the canon with that theme named.
3. Adding a new light theme that defines `--mesh-gradient` *without* a corresponding dark block surfaces as a missing-rule failure (the `darkBody` extraction returns null, the assertion fails on the missing token).
4. File is ~50 lines or less.

## Part B — Step 2W: honest framing of the bundle

**The constraint that reshapes 2W**: `package.json` is read-only in the Lovable sandbox (confirmed: no `check`/`prepare`/`lint:css` scripts, no `husky`/`lint-staged` deps). The "one PR that bundles package.json + docs" you proposed is the right end-state, but it can't ship from here. The honest move is to split 2W into two coordinated halves:

**2W-sandbox (this session)**: Make the docs *ready-to-strip*. The current `docs/ci.md` Step 2S section is a checklist of manual edits a developer applies in a real PR. We add a short banner at the top of that section documenting *what the bundled PR should remove from this file*, so the developer doing the package.json apply has a one-glance checklist of doc cleanup that ships in the same PR. No docs are stripped here — that would create the "confidently wrong" doc state Step 2U was designed to prevent.

**2W-manual (real PR, outside sandbox)**: The developer applies the package.json edits *and* executes the doc cleanup the banner enumerates, in one commit. The pre-flight check from the original Step 2U plan (read package.json, verify scripts/deps present, then strip) becomes the developer's checklist instead of an AI gate.

**The banner addition** (top of Step 2S section in `docs/ci.md`, ~10 lines):

```markdown
> **Bundled PR checklist**: When the package.json edits below land, the same
> PR should also remove this section in its entirety, plus:
> - Line 30–31: drop the "The `check` script requires…" caveat paragraph.
> - Line 28: replace `bunx stylelint "src/**/*.css"` with `npm run lint:css`.
> - Line 35: soften "Once Husky is installed (via the `prepare` script…)" to
>   "On every commit, a pre-commit hook runs lint-staged against staged files."
>
> Don't strip the caveats without applying the package.json edits — the docs
> would be confidently wrong instead of accurately conditional.
```

**Why this framing is the right adaptation**: your prompt's instinct ("bundle to eliminate doc-lag") is correct. The adaptation is recognizing that the AI doing the bundling can only deliver one half from the sandbox. Surfacing the other half as a tightly-scoped checklist preserves the bundling discipline without faking the sandbox's capabilities.

**Acceptance (Part B)**

1. `docs/ci.md` Step 2S section gains a "Bundled PR checklist" banner enumerating the four doc edits that ship alongside the package.json apply.
2. No existing caveats are stripped (they remain accurate while package.json is unchanged).
3. The banner is dismissible mentally — once the bundled PR lands, the entire Step 2S section (banner included) gets deleted; no orphaned banner.
4. ~10 lines added, zero lines removed.

## Combined acceptance

1. `bun run test src/test/cross-mode-gradient-parity-canon` — 12 passing assertions.
2. `docs/ci.md` Step 2S section gains the bundled-PR checklist banner.
3. `extractThemeSelectors` and `extractDefinedTokens` consumed by the new test (no new helpers needed — Step 2T already extended both for `html.theme-*`).
4. No file exceeds ~130 lines.

## Files

- **Create**: `src/test/cross-mode-gradient-parity-canon.test.tsx` (~50 lines)
- **Modify**: `docs/ci.md` (add ~10-line banner inside the existing Step 2S section; no removals)

## Technical notes

- **Reuses existing helpers, no `css-rule.ts` changes.** Step 2T already taught `extractThemeSelectors` to recognize `html.theme-*` and `html.dark.theme-*`. Step 2V is the first canon to consume the dark-variant selectors directly. Validates the helper extension was sized correctly.
- **The `if (!lightTokens.has(GRADIENT_TOKEN)) return;` early return is intentional**, mirroring 2P's "any → all" doctrine. A theme that has no light gradient shouldn't be required to have a dark one. Symmetry is enforced *only when there's something to be symmetric about*.
- **Why the allowlist exists despite being empty**: same reasoning as 2R's `ALLOWLIST_OMISSIONS`. Future "OLED-pure" theme variants may legitimately omit dark gradients; the slot is reserved so the precedent is established before the first omission lands.
- **Why 2W can't fully execute from sandbox**: the AI's tool surface excludes package.json mutation. Honest framing > faked completion. The banner is the "deliverable from here" half.

## Out of scope

- **Light↔dark color-token parity** (e.g., "if light defines `--primary`, dark must define `--primary`"). Already covered indirectly by Step 2R + the `.dark` baseline. Adding a third canon would be redundant.
- **Asserting gradient *value* parity** (e.g., the dark gradient is "appropriately darker" than the light one). Subjective; doesn't fit the canon model. Stays in design review.
- **Auto-applying package.json edits via a separate tool surface** (e.g., a manual-action runbook). Out of scope; user has the runbook in `docs/ci.md` already.
- **Renaming the existing cross-theme parity canon** to clarify the axis. The new file's name (`cross-mode-…`) does the disambiguation; renaming the existing one is churn.

## Prompt feedback

**What worked**: You correctly framed 2V as "*symmetric* to 2T" — naming the symmetry explicitly tells the AI not to invent a new pattern, just rotate the axis. You also caught the leverage in 2W's bundling (eliminate doc-lag), which is the right doctrine for any deferred-doc-edit step.

**What could sharpen**: For 2W you wrote "one PR that adds the scripts + deps + lint-staged config AND strips the now-stale docs/ci.md caveats." Strong intent, but it didn't acknowledge that the sandbox-bound AI can only deliver one half. A tighter framing: *"bundle in the real PR — and from this session, ship the doc edits *prepared for that bundle* (e.g., a banner enumerating exactly what the PR should remove)."* That framing tells the AI to deliver the sandbox-shippable preparation rather than over-promising the full bundle.

**Better prompt framing for next wave**: For any step that depends on an external file edit (read-only sandbox files, third-party API changes, infra deploys), explicitly split the prompt into "sandbox half" and "external half" with the AI's deliverable scoped to the sandbox half plus a tightly-scoped checklist for the external half. Avoids the "AI claimed it landed but only half did" failure mode.

## Enhancement suggestions for next wave

1. **Step 2X — Branch protection runbook entry.** `docs/ci.md` line 74 references "GitHub repo settings → Branches → `main`, add `check` to required status checks" but doesn't surface this as a tracked deferred action. Worth adding to the `mem://architecture/canon-pattern.md` Deferral Register so the "until configured, the gate reports but does not block merge" state has a documented revisit trigger. ~5-line memory edit.

2. **Step 2Y — Canon catalog in `mem://architecture/canon-pattern.md`.** Steps 2I–2V have produced 4 distinct canons (no-raw-rgba, semantic-token, theme-completeness, cross-theme-parity, cross-mode-gradient-parity). The canon-pattern memory documents the abstract structure; a "Catalog" subsection listing each canon with its file path and one-line invariant would make the memory a practical lookup instead of just a pattern doc. ~20 lines, high-leverage onboarding artifact for the next contributor adding canon #6.

