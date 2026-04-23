

# Step 2R + 2S — Cross-theme parity canon, and local check loop

Two enhancements riding the Step 2P/2Q foundation. Part A adds the next canon layer up (cross-theme parity, building on within-family completeness). Part B closes the local→CI gap so violations surface before push.

## Part A — Cross-theme parity canon (Step 2R)

**The invariant**: Every non-`:root` theme selector defines exactly the same token set as `:root`, modulo a deliberate-omission allowlist. Catches the "theme adds a one-off custom token" or "theme quietly omits one" regressions that within-family completeness can't see.

**Why this is distinct from 2P**: Step 2P enforces *within-family* completeness ("if you touch chart, define all 5 charts"). 2R enforces *cross-theme parity* ("if `:root` defines `--my-special-token`, every theme defines it too, or it's allowlisted"). Different invariant, different failure mode.

**New shared helper in `src/test/css-rule.ts`**

```ts
export function extractDefinedTokens(ruleBody: string): string[]
```

Scans a rule body for `--token-name:` declarations and returns the deduplicated, sorted list of token names (without the leading `--`). ~8 lines. Pure function, no FS.

**New test file: `src/test/cross-theme-parity-canon.test.tsx`** (~50 lines)

Shape:

```ts
const ALLOWLIST_OMISSIONS: Record<string, string[]> = {
  // Per-theme deliberate omissions. Empty by default.
  // Example: ".theme-print": ["sidebar-background"] // print theme has no sidebar
};

const rootBody = extractRuleBody(indexCss, ":root");
const rootTokens = new Set(extractDefinedTokens(rootBody));
const themeSelectors = extractThemeSelectors(indexCss).filter(s => s !== ":root");

for (const selector of themeSelectors) {
  describe(`cross-theme parity: ${selector}`, () => {
    const body = extractRuleBody(indexCss, selector);
    const themeTokens = new Set(extractDefinedTokens(body));
    const allowedOmissions = new Set(ALLOWLIST_OMISSIONS[selector] ?? []);

    it(`defines all :root tokens (modulo allowlist)`, () => {
      const missing = [...rootTokens]
        .filter(t => !themeTokens.has(t))
        .filter(t => !allowedOmissions.has(t));
      expect(missing, `${selector} missing tokens defined in :root: ${missing.join(", ")}`).toEqual([]);
    });

    it(`introduces no tokens unknown to :root`, () => {
      const extras = [...themeTokens]
        .filter(t => !rootTokens.has(t));
      expect(extras, `${selector} defines tokens not in :root: ${extras.join(", ")}`).toEqual([]);
    });
  });
}
```

**Why an allowlist, not auto-discovery**: Same reasoning as the explicit `TOKENS` array (Step 2K) and explicit family lists (Step 2P). Deliberate omissions are rare and should be stated, not inferred. An empty allowlist is the strictest starting position; entries get added with a comment explaining why.

**Pre-flight expectation**: The first test run will reveal the actual parity state. If `:root` and theme selectors don't currently match, the canon's initial commit either (a) reflects the gap as allowlist entries with TODO comments, or (b) flags real regressions to fix in a follow-up step. The plan commits to running it and reporting; the codebase decides the cleanup scope.

## Part B — Local `npm run check` + Husky pre-commit hook (Step 2S)

**Files (and why each)**

1. **`package.json`** — Add three scripts and a `prepare` hook:
   ```json
   "scripts": {
     "lint:css": "stylelint \"src/**/*.css\"",
     "check": "npm run lint:css && npm run lint && vitest run",
     "prepare": "husky"
   }
   ```
   Existing `lint` (ESLint) and `test` scripts are reused as-is. `check` is the unified gate.

2. **`.husky/pre-commit`** — One-line hook:
   ```sh
   npx lint-staged
   ```
   Runs lint-staged (already configured per the existing `docs/ci.md` spec) — Stylelint on staged CSS, ESLint on staged TS/TSX. Vitest stays out of the hook intentionally (per the existing docs: a failing test on an unrelated file would block commits to files the contributor didn't touch).

3. **`package.json`** — Add `lint-staged` and `husky` devDependencies plus a `lint-staged` config block:
   ```json
   "lint-staged": {
     "*.css": "stylelint",
     "*.{ts,tsx}": "eslint --max-warnings=0"
   }
   ```

**CI workflow update**: Replace `bunx stylelint "src/**/*.css"` with `bun run check` in `.github/workflows/test.yml` so local and CI run the same command. One-line change.

**Why Husky over a bare `.git/hooks/pre-commit`**: Husky is the standard, survives clones (registered via `prepare`), and matches what `docs/ci.md` already documents. No reinvention.

**Acceptance (Part B)**

1. `npm run check` runs Stylelint → ESLint → Vitest in sequence and fails fast on the first error.
2. After `npm install`, `.husky/pre-commit` is registered and runs on staged files.
3. Committing a file with a Stylelint violation (raw `rgba` outside a token block) is blocked locally.
4. `git commit --no-verify` bypasses the hook (already documented in `docs/ci.md`).
5. CI runs `bun run check` and matches local behavior — same gates, same order.

## Combined acceptance

1. `npm run check` — passes on the current codebase end-to-end.
2. `bun run test src/test/cross-theme-parity-canon` — passes (or surfaces the gap as documented allowlist entries).
3. `extractDefinedTokens` exported from `@/test/css-rule`, consumed by the new test.
4. CI workflow uses `bun run check` instead of inline stylelint command.
5. Husky pre-commit hook wired and runs lint-staged.
6. No file exceeds ~130 lines.

## Files

- **Modify**: `src/test/css-rule.ts` (add `extractDefinedTokens`)
- **Create**: `src/test/cross-theme-parity-canon.test.tsx`
- **Modify**: `package.json` (scripts, devDependencies, lint-staged config, prepare hook)
- **Create**: `.husky/pre-commit`
- **Modify**: `.github/workflows/test.yml` (swap inline stylelint for `bun run check`)

## Technical notes

- **`extractDefinedTokens` is the third helper in `css-rule.ts`** — alongside `extractThemeSelectors` and `findConfigReference`. The module's identity has settled: it's the structural-CSS-knowledge module, not a generic utility dump. New helpers join only when they encode CSS shape rules.
- **Two parity assertions per theme, not one** — "missing from theme" and "extra in theme" are different failure modes with different remediations. Splitting them gives two clear reporter lines per theme instead of one combined diff.
- **`ALLOWLIST_OMISSIONS` is per-selector, not per-token** — because the same token might be intentionally omitted in one theme but required in another. The shape (selector → tokens) matches how the omissions actually arise.
- **Husky 9+ syntax** — modern Husky doesn't need `husky install` anymore; `prepare: "husky"` is the full setup. Avoids the deprecated shebang + chmod dance.
- **`vitest run` not `vitest`** — `check` runs once and exits; the watcher is for dev iteration. Critical for CI parity.

## Out of scope

- **Asserting parity *values*** (e.g., "every theme's `--primary` is a valid HSL triple") — different canon (format validation per theme), different complexity. The Stylelint plugin already enforces "no raw rgba/hex"; HSL-shape validation is a future step if regressions appear.
- **Auto-detecting allowlist entries from a "// canon-omit" comment in CSS** — explicit allowlist beats inline magic. Same reasoning as every prior canon's explicit lists.
- **Migrating to a single config-driven canon framework** — three test files at this size is fine; a framework for three files is over-engineering. Revisit at ~6 files.
- **Adding Prettier to `npm run check`** — formatting is a separate concern; conflating it with correctness gates dilutes both. If desired, add `format:check` as its own step later.
- **Changing the existing `lint` ESLint behavior** — `check` consumes it as-is. ESLint config tuning is a separate session.

## Prompt feedback

**What worked**: You correctly framed 2R as "the next layer up" — naming the layering (within-family → cross-theme) explicitly anchors the new canon's scope without overlapping the existing one. You also flagged 2S as "still deferred" with the specific origin step (2I) — that historical pointer prevents re-deriving the deferral context.

**What could sharpen**: For 2R you wrote *"~30 lines on top of extractThemeSelectors + a new extractDefinedTokens(body) helper."* Accurate for the test, but the helper itself plus the inevitable allowlist tuning (if the codebase isn't already perfectly parity-clean) could push the actual delta higher. A tighter framing: *"~40 lines for the test, ~8 for the helper, plus possible allowlist entries depending on what the first run reveals."* Surfacing the "first run determines cleanup scope" reality up front prevents the "why didn't you finish the cleanup?" round-trip.

**Better prompt framing for next wave**: When a canon is being added to a codebase that may already violate it, the prompt should explicitly acknowledge two outcomes — "passes immediately" vs "reveals existing gaps" — and state the preferred handling for each (allowlist + TODO vs immediate fix). You did this implicitly with "modulo a deliberate-omission allowlist"; making it explicit ("first run will either pass or surface entries — list each surfaced entry as an allowlist with a TODO") removes ambiguity about the deliverable.

## Enhancement suggestions for next wave

1. **Step 2T — Drive existing allowlist entries to zero.** If 2R's first run produces allowlist entries with TODOs, a follow-up step audits each entry: is the omission intentional (keep + document the why) or an oversight (fix the theme + remove the entry)? Closes the "allowlist as graveyard" failure mode where TODOs accumulate without resolution. Scope depends entirely on what 2R reveals; could be 0 entries (no work) or ~10 (one focused session).

2. **Step 2U — Surface `npm run check` in `docs/ci.md`'s "Running locally" section.** Once 2S lands, the docs should reflect that `npm run check` is real (currently the section says "once the `check` script is added"). Two-line edit; keeps onboarding docs in sync with the actual command surface. High-leverage cleanup.

