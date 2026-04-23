

# Step 2F — Catch the next scrollbar-class regression before it ships

Two enhancements, bundled because they share a root cause: **hardcoded `rgba(0,0,0,…)` / `rgba(255,255,255,…)` values don't respond to theme, and we have no automated net to catch them.** Step 2E fixed the three known scrollbar offenders. This step finds the rest and locks in the canon.

## Part A — Audit and fix remaining hardcoded rgba in `index.css`

Goal: every color value in `index.css` either (a) resolves through an HSL token, or (b) has a documented reason to be literal (e.g., a pure-black overlay on a modal scrim where theme-awareness would be wrong).

**Approach**

1. Grep `src/index.css` for `rgba(0,` `rgba(255,` `rgba(128,` and any raw hex (`#[0-9a-f]{3,8}`) outside of `:root` / `.dark` token definitions.
2. Categorize each hit into one of three buckets:
   - **Fix** — surface color that should follow theme (scrollbar variants, hover fills, borders, shadows on tinted surfaces). Rewrite to `hsl(var(--token) / alpha)`.
   - **Keep, annotate** — intentional literal (modal scrims, blur overlays where pure black is the design intent, SVG pattern fills). Add a `/* intentional literal: <reason> */` comment above the line.
   - **Delete** — dead rule (duplicate, overridden, or orphaned from a removed component). Remove.
3. Produce a short inline comment block at the top of any rewritten section noting which token family it resolves to, so the next reader knows not to hardcode again.

**Expected scope**
Based on the Step 2E discovery, likely 4–8 more sites — scrollbar corner rules, a few `.card-glow` / `.elevation-*` shadows, maybe a backdrop or focus-ring fallback. I'll only know the exact list after the grep; the plan covers the pattern, not an exhaustive pre-written diff.

**Acceptance (Part A)**

1. `git grep 'rgba(0, 0, 0'` and `git grep 'rgba(255, 255, 255'` in `src/index.css` return only annotated "intentional literal" hits.
2. Toggling dark mode on any page shows no invisible/wrong-color element that was previously hardcoded.
3. No visual change on light-mode surfaces (token values are chosen to match current appearance at the default theme).

## Part B — Visual regression snapshot for scrollbars

Goal: if anyone future-edits `tokens.scrollbar.thumb`, `.scrollbar-thin`, `.scrollbar-minimal`, the native `::-webkit-scrollbar` block, or the Firefox `scrollbar-color` rules, a test fails before the PR lands.

**Approach — computed-style assertion, not pixel diff**

Pixel-diff visual regression (Playwright/Chromatic) is out of scope — it requires CI infra this project doesn't have. Instead, add a Vitest + jsdom test that asserts the *computed CSS tokens* on a rendered scrollable surface. This catches the exact regression class we just fixed (token family swap, hardcoded fallback sneaking back in) without needing a rendering browser.

**Files**

1. `vitest.config.ts`, `src/test/setup.ts`, `tsconfig.app.json` — per the frontend-testing-setup guide, only if not already present. (I'll check first; if the project already has Vitest configured, skip.)
2. `src/test/scrollbar-tokens.test.tsx` — new. Three assertions:
   - **Radix ScrollArea thumb** renders with classes containing `bg-muted-foreground/25`, `hover:bg-muted-foreground/45`, `active:bg-primary/50`. Renders `<ScrollArea>` with tall content, queries the thumb, asserts `className` includes the canonical tokens. This catches regressions in `tokens.scrollbar.thumb` directly.
   - **`.scrollbar-thin` utility** — mount a `<div className="scrollbar-thin">`, read the stylesheet rule via `document.styleSheets`, assert the `:hover::-webkit-scrollbar-thumb` rule's `background-color` property string contains `--muted-foreground`. (jsdom parses CSS rules even though it doesn't render them.)
   - **`.scrollbar-minimal` utility** — same as above, 4px width, same token family.
3. `src/test/scrollbar-tokens.fixtures.ts` — small helper that reads a class rule out of `document.styleSheets` by selector, since jsdom's CSSOM is awkward. Keeps the test readable.

**Why this works**

- Token-family regressions (the exact bug Step 2E fixed: `foreground` vs `muted-foreground`) show up as a string mismatch in the className or the rule body. Test fails loudly.
- Hardcoded `rgba(...)` creeping back in fails the `toContain('--muted-foreground')` assertion.
- No browser needed, runs in <1s, no CI infra changes.

**What this deliberately doesn't test**

- Actual rendered pixel color (needs headless browser).
- Hover-state timing / transitions (functional, not visual-canon).
- macOS overlay scrollbar auto-hide (system-governed).

**Acceptance (Part B)**

1. `npx vitest run src/test/scrollbar-tokens` passes on the current codebase.
2. Reverting `tokens.scrollbar.thumb` to its pre-Step-2E `bg-foreground/15` value causes the test to fail with a clear message naming the expected token.
3. Replacing `hsl(var(--muted-foreground) / 0.25)` in `.scrollbar-thin` with a hardcoded `rgba(0,0,0,0.15)` causes that test to fail.
4. Test file is under 80 lines including the fixture helper — readable, not clever.

## Technical notes

- Vitest + jsdom is already the sanctioned testing stack for this project (see `<useful-context>`). If `vitest.config.ts` doesn't exist yet, I'll scaffold it per the guide in one shot; if it does, I'll only add the test file.
- Part A is pure `src/index.css` edits — no token changes, no component changes.
- The two parts are independent; if Part A surfaces nothing worth fixing (grep returns only legitimate literals), Part A becomes "add the annotation comments and move on," and Part B is still worth shipping.

## Out of scope

- Playwright / Chromatic / any pixel-diff tooling.
- Testing shadows, borders, or other token families (scope creep — scrollbars are the concrete regression class we just hit).
- Adding a lint rule to ban `rgba(` outside token definitions (possible Step 2G; too heavy for this wave).
- Refactoring `.scrollbar-hide` or other intentionally-literal utilities.

