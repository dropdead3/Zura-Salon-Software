

# Step 2P + 2Q — Per-theme completeness canon, and shared `css-rule.ts` helpers

Two enhancements, one shared dependency. Part A (Step 2P) needs to know what counts as a "theme" in `index.css`, which is a parsing concern that belongs in `css-rule.ts`. Once that helper lands, Part B (Step 2Q) cleanly promotes the config-shape resolver alongside it — both helpers are CSS/Tailwind structural knowledge that doesn't belong in a single test file.

**Note on prior state**: The current `semantic-token-canon.test.tsx` still uses the inline `configBlockRe` flat-block regex (the shape-aware `findConfigReference` from the Step 2N+2O summary isn't actually present in the file). Step 2Q therefore both **introduces** the shape-aware helper *and* places it in the shared module — one move, not two.

## Part A — `extractThemeSelectors()` in `css-rule.ts` (Step 2P prerequisite)

**What ships**

A helper in `src/test/css-rule.ts` that scans CSS source and returns the list of theme-defining selectors:

```ts
export function extractThemeSelectors(cssSource: string): string[]
```

Returns selectors matching the existing canon's allowlist: `:root`, `.dark`, `.theme-*`, `[data-theme="..."]`. Deduplicated, in source order.

**Implementation shape**

Reuses the same selector regex the existing test already uses (line 71–72 of the test file). One ~10-line function. Exported alongside `extractRuleBody` and `extractAllRuleBodies`.

## Part B — Promote `findConfigReference()` to `css-rule.ts` (Step 2Q)

**What ships**

The shape-aware Tailwind config resolver, introduced and placed directly in the shared module. Handles four shapes:

1. **Flat with foreground**: `destructive: { DEFAULT: ..., foreground: ... }`
2. **Flat string**: `border: "hsl(var(--border))"`
3. **Nested numbered**: `chart: { "1": ..., "2": ... }`
4. **Nested named (sidebar hybrid)**: `sidebar: { DEFAULT: "hsl(var(--sidebar-background))", primary: ... }`

```ts
export function findConfigReference(
  configSource: string,
  token: string
): string | null
```

Returns the matched config substring (block or line) or `null` if the token isn't routed in config. Pure function; no FS access (caller passes `tailwindConfig`).

**Why introduce it directly in the shared module**: The Step 2P canon will be the second consumer immediately. Introducing it as a local helper just to promote it in the same step is wasted motion.

## Part C — Per-theme completeness canon (Step 2P)

**What ships**

A new test file: `src/test/theme-completeness-canon.test.tsx` (~50 lines).

**The invariant**: Every theme selector that defines *any* token from a required-set must define *all* tokens in that set. Catches the "Cream forgot `--chart-3`" regression.

**Required-set definition**

Two parameterized sets, matching the families the existing canon already guards:

- **Semantic family**: `destructive`, `success`, `warning`, `info`, `primary`, `secondary`, `accent`, `muted`, `card`, `popover`, `background`, `foreground`, `border`, `input`, `ring`
- **Chart family**: `chart-1` through `chart-5`
- **Sidebar family**: `sidebar-background`, `sidebar-foreground`, `sidebar-primary`, `sidebar-accent`, `sidebar-border`, `sidebar-ring`

**Test shape (per family)**

```text
For each theme selector returned by extractThemeSelectors():
  Extract the rule body
  If the body defines ANY token in the family:
    Assert it defines ALL tokens in the family
  Else: skip (theme inherits this family)
```

Failure messages list the missing tokens by name, scoped to the offending theme selector — debuggable at a glance.

**Why "any → all" not "all → all"**: Some themes legitimately inherit (e.g., a hypothetical light variant inheriting chart palette from `:root`). The canon shouldn't force every theme to redefine every family — only force consistency within a family if the theme touched it at all.

## Part D — Refactor existing test to consume the shared helpers

`src/test/semantic-token-canon.test.tsx` updates:

1. Import `findConfigReference` from `@/test/css-rule`.
2. Replace the inline `configBlockRe` / `configBlock` lookup (lines 46–47, 90–103) with the helper.
3. Add a `TOKENS_WITH_FOREGROUND` set so the foreground assertion only runs when applicable (chart/border/input/ring/background/foreground skip it).
4. Update the file-level comment to reference shape-aware lookup.

This is the same change the Step 2N+2O summary described, but actually applied to the file since prior state shows it wasn't.

## Combined acceptance

1. `bun run test src/test/semantic-token-canon` — all assertions pass, skips drop to near-zero (only `--info` if genuinely absent from CSS).
2. `bun run test src/test/theme-completeness-canon` — passes on current codebase across all themes × all three families.
3. Deleting `--chart-3` from a single `.theme-cream` block fails the chart-family completeness test with a message naming both the theme and the missing token.
4. Adding a new theme that defines `--primary` but forgets `--secondary` fails the semantic-family completeness test.
5. `findConfigReference` and `extractThemeSelectors` exported from `@/test/css-rule`, both consumed by at least one test file.
6. No file exceeds ~130 lines.

## Technical notes

- **Two helpers, one module promotion** — `extractThemeSelectors` and `findConfigReference` both live in `css-rule.ts` because both encode structural knowledge about the project's CSS / Tailwind shape that isn't test-specific. Future canons reuse them; the shape rules don't get re-derived.
- **The "any → all" rule is the key design choice in 2P** — it permits intentional inheritance while catching forgetful overrides. Pure "every theme defines every token" would generate false positives the moment someone adds a single-purpose theme variant.
- **Family-aware, not token-aware** — completeness is a family property (chart palette is meaningful as a set of 5; sidebar is meaningful as a set of 6). One token from a family in a theme implies intent to redefine the family.
- **No Stylelint counterpart needed** — completeness is inherently cross-rule (requires looking at all declarations within a theme block), which Stylelint's per-rule model handles poorly. Vitest is the right gate here.

## Out of scope

- **Auto-discovering token families from CSS** — same reasoning as the rejected auto-`TOKENS` array. Explicit family lists are the contract.
- **Asserting that every theme defines `:root`'s full token set** — different canon (cross-theme parity, not within-family completeness). Possible future step if regressions appear.
- **Migrating the scrollbar fixture shim** — already retired in Step 2I. Not relevant.
- **Renaming `semantic-token-canon.test.tsx`** — its scope is unchanged; the new file handles the new invariant.

## Prompt feedback

**What worked**: You correctly identified the dependency ordering ("2P needs the helper *first*") and the threshold rationale for 2Q ("two consumers = promote"). That framing means the AI doesn't have to relitigate whether to extract — it's a stated rule.

**What could sharpen**: The prompt described 2P as "~40 lines after that" — accurate for the test file alone, but the helper plus the test plus the existing-file refactor (to consume the new shared helper) is closer to ~80 lines total across three files. A tighter framing: *"~40 lines for the new test, ~10 for the helper, plus refactor the existing test to consume both helpers."* Surfacing the refactor explicitly avoids the trap of shipping the shared helper without rewiring the existing consumer.

**Better prompt framing for next wave**: When promoting a helper to a shared module, the prompt should always include "and rewire all existing consumers" as a checklist item. Otherwise the helper exists in two places (shared + inline) for one step, which is the worst of both worlds.

## Enhancement suggestions for next wave

1. **Step 2R — Cross-theme parity canon.** Stronger than 2P's within-family completeness: assert every non-`:root` theme selector defines exactly the same token set as `:root` (modulo deliberate omissions in an allowlist). Catches a future theme that adds a custom token nobody else has, or omits one quietly. ~30 lines once `extractThemeSelectors` exists.

2. **Step 2S — `npm run check` script + Husky wiring (deferred from Step 2I).** The CI workflow exists per Step 2J, but the local `npm run check` script and Husky pre-commit hook were left as manual actions. Worth a session to land them so the local→CI loop is closed end-to-end. Mostly `package.json` edits plus a Husky install step.

