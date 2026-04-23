

# Step 2N + 2O — Sidebar canon, and a token-shape-aware config assertion

Two enhancements, one shared root cause. The current Vitest config assertion assumes every token is (a) a flat top-level Tailwind block and (b) has a `-foreground` pair. Sidebar tokens and chart tokens both break that assumption — sidebar nests `DEFAULT` for the base, chart nests numbered variants. Fixing the assertion shape closes both.

## Findings from pre-flight audit

**Sidebar tokens** — 8 tokens, all 11 themes redefine the full set, `tailwind.config.ts` has a `sidebar` block routing everything through `hsl(var(--sidebar-*))`. Candidate 1 (same canon as semantic tokens), with two shape adjustments: (a) base token is `--sidebar-background` not `--sidebar`, (b) foreground is `--sidebar-foreground` not `--sidebar-background-foreground`.

**Chart tokens** — 5 tokens, all themes redefine, Tailwind nests them as `chart: { "1": "hsl(var(--chart-1))", ... }`. No `-foreground` pair. Current regex doesn't match nested shape.

## Part A — Token-shape-aware config assertion (Step 2O)

**What changes**

The `it.skipIf(!configBlock)` assertion currently looks for `${token}: { ... }` at the top level. We replace that with a shape-aware lookup that handles three patterns:

1. **Flat with foreground pair** (current default): `destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" }` — applies to `destructive`, `success`, `warning`, `info`, `primary`, `secondary`, `accent`, `muted`, `card`, `popover`.
2. **Flat without foreground**: `border: "hsl(var(--border))"`, `input: "hsl(var(--input))"`, `ring: "hsl(var(--ring))"`, `background: "hsl(var(--background))"`, `foreground: "hsl(var(--foreground))"` — top-level string mapping, no nested object.
3. **Nested numbered**: `chart: { "1": "hsl(var(--chart-1))", "2": ... }` — child keys are quoted numerics; parent key is the family name (not the token name).

**Implementation approach**

Add a small `findConfigReference(token)` helper at the top of the test file that returns the matched config snippet (or null). It tries each shape in order and returns the first match. The assertion then becomes:

```ts
const configRef = findConfigReference(token);
it.skipIf(!configRef)(
  `tailwind.config.ts routes ${token} through hsl(var(--${token}))`,
  () => {
    expect(configRef).toContain(`hsl(var(--${token}))`);
    // Foreground pair only required when token has one (semantic family)
    if (TOKENS_WITH_FOREGROUND.has(token)) {
      expect(configRef).toContain(`hsl(var(--${token}-foreground))`);
    }
    expect(configRef).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(configRef).not.toMatch(/\brgba?\(\s*\d/);
  },
);
```

A `TOKENS_WITH_FOREGROUND` set lists which tokens actually have foreground pairs. Tokens not in the set skip the foreground check (chart, border, input, ring, background, foreground itself).

**Acceptance (Part A)**

1. The 5 chart tokens previously skipped now run their config assertion and pass.
2. The 6 form/chrome/surface tokens currently passing still pass (no regression).
3. Vitest reporter shows fewer skips overall — the only remaining skips are tokens genuinely absent from the config.
4. Inserting `chart: { "1": "#ff0000" }` in `tailwind.config.ts` fails the chart-1 assertion with a clear message.

## Part B — Sidebar token canon (Step 2N)

**What changes**

Two pieces, both small:

**1. Add sidebar tokens to the `TOKENS` array** in `src/test/semantic-token-canon.test.tsx`:

```ts
const TOKENS = [
  // ... existing 15 tokens ...
  "sidebar-background", "sidebar-foreground",
  "sidebar-primary", "sidebar-accent",
  "sidebar-border", "sidebar-ring",
] as const;
```

Six entries (not eight) — `sidebar-primary-foreground` and `sidebar-accent-foreground` are auto-covered by the `(-foreground)?` regex inside the existing assertions. Same trick the current code uses for `destructive` covering `destructive-foreground`.

**2. Update the foreground-pair set** so `sidebar-primary` and `sidebar-accent` get foreground assertions, but `sidebar-background`, `sidebar-foreground`, `sidebar-border`, `sidebar-ring` skip the foreground check (they have no pair).

**Why six entries, not one parameterized "sidebar"**: The shape is genuinely different per sub-token. Bundling them as one parametric token would obscure failures — a regression in `--sidebar-border` should report as such, not as a generic "sidebar" failure. Six entries, six reporter lines, debuggability preserved.

**Config-shape note**: Sidebar's Tailwind block uses `DEFAULT: "hsl(var(--sidebar-background))"` for the base mapping. Pattern 2 in Part A handles this — the helper finds `hsl(var(--sidebar-background))` inside the nested `sidebar` block via plain string contains, without needing a top-level `sidebar-background` block.

**Acceptance (Part B)**

1. Sidebar tokens in CSS pass all three canon assertions across all 11 themes.
2. Removing `--sidebar-primary` from a single theme fails the "every declaration sits in a token-definition selector" test (or its sibling — depends which theme is broken).
3. Inserting `--sidebar-background: #ff0000;` somewhere fails the hex-literal assertion.
4. Reporter shows 6 new sidebar suites; total visible suites grows from ~20 to ~26.

## Combined acceptance

1. `bun run test src/test/semantic-token-canon` — all assertions pass on current codebase.
2. Skip count drops to near-zero (only tokens genuinely absent from CSS or Tailwind config skip).
3. Test file stays under 130 lines.
4. No changes outside `src/test/semantic-token-canon.test.tsx`.

## Technical notes

- **The `findConfigReference` helper is the keystone** — a ~20-line function that takes a token name and returns the matched config substring. Once it exists, both sidebar and chart slot in cleanly. Future canons (e.g., a hypothetical surface-tokens family with similar nesting) reuse it.
- **`TOKENS_WITH_FOREGROUND` is the explicit allowlist** — no auto-detection, no inference. The set is a literal: `new Set(["destructive", "success", "warning", "info", "primary", "secondary", "accent", "muted", "card", "popover", "sidebar-primary", "sidebar-accent"])`. Anything outside this set skips the foreground check by design, not by accident.
- **Why not refactor the file structure** — the test is now ~125 lines after both parts. Still a single parameterized loop, single helper, easy to read. Splitting into multiple files (one per token family) would be premature.
- **Sidebar tokens use the sidebar Tailwind block via shape pattern 2/3 hybrid** — `sidebar.DEFAULT` maps to `--sidebar-background`, child keys map by name. The helper handles this with a single regex over the `sidebar:` block contents, not by splitting into sub-cases.

## Out of scope

- **Auto-detecting `TOKENS_WITH_FOREGROUND` from the CSS** — same reasoning as the auto-generated `TOKENS` array rejected in Step 2K. Explicit list beats inference; the maintenance cost is one line per new token.
- **Asserting that themes which redefine `--sidebar-background` also redefine all 7 sibling tokens** — a "completeness per theme" canon is a different shape (cross-token dependency, not per-token shape). Worth a future step if a theme ever forgets one. Currently all 11 themes are complete; nothing to enforce.
- **Renaming or restructuring `semantic-token-canon.test.tsx`** despite now covering chart and sidebar families — naming churn without value. The file's job is "shadcn-style cross-cutting tokens"; that's still accurate.
- **Stylelint additions for sidebar/chart** — the existing `no-raw-rgba-outside-tokens` plugin already covers these (it scans all `.css` rules, not just specific token names). No new plugin needed.

## Prompt feedback

**What worked**: You sequenced Step 2O *after* 2N in the prompt but the technical dependency runs the other way — Part A (config-shape fix) is a prerequisite for Part B's sidebar work to assert cleanly. Recognizing that and bundling them with the shared root cause keeps this a single coherent change instead of two half-fixes. Your prompt left enough room for that reordering by not over-specifying file-by-file diffs.

**What could sharpen**: You phrased Step 2O as "tighten the regex" — accurate but understates the work. The real change is "make the config assertion shape-aware," which is a small architectural improvement rather than a regex tweak. A tighter framing: *"The current assertion assumes flat blocks with foreground pairs; teach it the shapes shadcn actually uses (nested numbered, nested DEFAULT, flat-no-pair)."* That framing surfaces the reusability — sidebar and chart aren't two regex bugs, they're two cases of the same shape gap.

**Better prompt framing for next wave**: When two enhancements share a root cause (as 2N and 2O did), naming it explicitly in the prompt — e.g., *"Both fail for the same reason: assertion assumes flat config shape. Fix the shape-awareness, then sidebar and chart fall out of it."* — saves the AI from re-deriving the dependency. You already wrote it as two steps; framing it as "one root cause, two beneficiaries" would be even tighter.

## Enhancement suggestions for next wave

1. **Step 2P — Per-theme completeness canon.** Currently the canon checks each token in isolation ("is `--sidebar-primary` defined somewhere reasonable?"). It doesn't check that *every theme* defines *every required token*. A new test iterating themes × tokens would catch a future Cream theme forgetting `--chart-3`. ~40 lines, parameterized the same way; requires extracting theme selectors from `index.css` first (a small helper in `css-rule.ts`).

2. **Step 2Q — Move `findConfigReference` to `css-rule.ts`.** If 2P ships, the helper has two consumers. That's the threshold for promoting it from local-helper to shared-utility (matching the rule that finally killed the scrollbar shim in Step 2I). Small refactor, zero new behavior, one less duplication.

